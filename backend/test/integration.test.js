import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import '../src/config.js';
const database = `portfolio_test_${crypto.randomBytes(6).toString('hex')}`;
process.env.DB_NAME = database;
const { app } = await import('../src/app.js');
const { pool, query } = await import('../src/db.js');
const { profile } = await import('../data/seed.js');
const { parseRepository, safeFile, sanitizeSource, inspect, discover } =
  await import('../src/github.js');
const { generateDraft } = await import('../src/ai.js');
let bootstrap, cookie, csrf;
const password = crypto.randomBytes(20).toString('hex');
const payload = {
  title: 'Verified test project',
  slug: 'test-project',
  overview: 'A test fixture.',
  repositoryUrl: 'https://github.com/example/repository',
  status: 'draft',
  featured: true,
  position: 0,
};
const validDraft = (title, sourcePath = 'README.md') => ({
  title,
  tagline: '',
  overview: 'A source-supported project summary.',
  problem: '',
  outcomes: '',
  architecture: '',
  challenges: '',
  learnings: '',
  features: ['Project route'],
  technologies: [],
  connections: [],
  suggestedSections: [],
  missingInformation: [],
  claimEvidence: [
    { section: 'overview', claim: 'A source-supported project summary.', sources: [sourcePath] },
    { section: 'features', claim: 'Project route', sources: [sourcePath] },
  ],
});
const admin = (method, path, body) => {
  let r = request(app)[method](path).set('Cookie', cookie).set('X-CSRF-Token', csrf);
  return body ? r.send(body) : r;
};
before(async () => {
  bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await bootstrap.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  const sql = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  for (const s of sql
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean))
    await query(s);
  await query('INSERT INTO profile (id,data) VALUES (1,?)', [JSON.stringify(profile)]);
  await query('INSERT INTO administrators (email,password_hash) VALUES (?,?)', [
    'test@example.com',
    await bcrypt.hash(password, 12),
  ]);
});
after(async () => {
  await pool.end();
  if (bootstrap) {
    await bootstrap.query(`DROP DATABASE \`${database}\``);
    await bootstrap.end();
  }
});
test('authentication rejects invalid credentials and protects admin reads', async () => {
  assert.equal((await request(app).get('/api/admin/projects')).status, 401);
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
    ).status,
    401,
  );
  const r = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password });
  assert.equal(r.status, 200);
  cookie = r.headers['set-cookie'][0].split(';')[0];
  assert.match(r.headers['set-cookie'][0], /HttpOnly/);
  assert.match(r.headers['set-cookie'][0], /SameSite=Strict/);
  csrf = r.body.data.csrfToken;
  assert.equal((await admin('get', '/api/auth/session')).status, 200);
});
test('CSRF and cross-origin mutations are rejected', async () => {
  assert.equal(
    (await request(app).post('/api/admin/projects').set('Cookie', cookie).send(payload)).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/admin/projects')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrf)
        .set('Origin', 'https://attacker.example')
        .send(payload)
    ).status,
    403,
  );
});
test('project lifecycle, draft privacy, duplicates, optimistic edits, ordering, and delete', async () => {
  let r = await admin('post', '/api/admin/projects', payload);
  assert.equal(r.status, 201);
  let p = r.body.data;
  assert.equal((await request(app).get('/api/projects')).body.data.length, 0);
  assert.equal((await request(app).get('/api/projects/test-project')).status, 404);
  assert.equal((await admin('post', '/api/admin/projects', payload)).status, 409);
  assert.equal(
    (await admin('put', `/api/admin/projects/${p.id}`, { ...p, version: 99 })).status,
    409,
  );
  r = await admin('put', `/api/admin/projects/${p.id}`, {
    ...p,
    status: 'published',
    features: [' Verified feature ', ''],
  });
  assert.equal(r.status, 200);
  p = r.body.data;
  assert.deepEqual(p.features, ['Verified feature']);
  assert.equal((await request(app).get('/api/projects/test-project')).body.data.title, p.title);
  r = await admin('post', '/api/admin/reorder', {
    items: [{ id: p.id, version: p.version }],
  });
  assert.equal(r.status, 200);
  p = r.body.data[0];
  assert.equal(p.position, 0);
  assert.equal(
    (
      await admin('post', '/api/admin/reorder', {
        items: [{ id: p.id, version: 1 }],
      })
    ).status,
    409,
  );
  r = await admin('put', `/api/admin/projects/${p.id}`, {
    ...p,
    status: 'draft',
  });
  p = r.body.data;
  assert.equal((await request(app).get('/api/projects')).body.data.length, 0);
  assert.equal(
    (
      await admin('delete', `/api/admin/projects/${p.id}`, {
        version: p.version,
      })
    ).status,
    200,
  );
  assert.equal((await admin('get', '/api/admin/projects')).body.data.length, 0);
});
test('profile updates require version and appear in public API', async () => {
  assert.equal((await admin('put', '/api/admin/profile', { ...profile, version: 99 })).status, 409);
  const r = await admin('put', '/api/admin/profile', {
    ...profile,
    name: 'Updated profile',
    version: 1,
  });
  assert.equal(r.status, 200);
  assert.equal((await request(app).get('/api/profile')).body.data.name, 'Updated profile');
});
test('contact validation and durable submission without SMTP', async () => {
  assert.equal(
    (await request(app).post('/api/contact').send({ name: 'A', email: 'bad', message: 'short' }))
      .status,
    400,
  );
  const r = await request(app).post('/api/contact').send({
    name: 'Recruiter',
    email: 'recruiter@example.com',
    message: 'A sufficiently long contact message.',
  });
  assert.equal(r.status, 201);
  assert.equal((await admin('get', '/api/admin/contacts')).body.data[0].delivery_status, 'stored');
});
test('URL validation and source filtering', () => {
  assert.deepEqual(parseRepository('https://github.com/mannansheth/Curatus.git'), {
    owner: 'mannansheth',
    repo: 'Curatus',
  });
  for (const url of [
    'https://github.com.evil.test/a/b',
    'http://github.com/a/b',
    'https://user:pass@github.com/a/b',
    'https://github.com/a/b/extra',
    'https://127.0.0.1/a/b',
  ])
    assert.throws(() => parseRepository(url));
  for (const p of [
    '.env',
    'backend/config/db.js',
    'node_modules/x.js',
    'dist/main.js',
    'credentials.json',
    'google-services.json',
    'package-lock.json',
  ])
    assert.equal(safeFile(p), false, p);
  const text = sanitizeSource(
    'const api_key="sensitive";\nconst greeting="hello";\nconst password = "hidden";',
  );
  assert.equal(text.includes('sensitive'), false);
  assert.equal(text.includes('hidden'), false);
  assert.match(text, /hello/);
});
test('missing Gemini credentials return a helpful error without GitHub requests', async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const r = await admin('post', '/api/admin/github/generate', {
      url: payload.repositoryUrl,
    });
    assert.equal(r.status, 503);
    assert.match(r.body.error, /GEMINI_API_KEY/);
    await assert.rejects(generateDraft({}), /not configured/);
  } finally {
    if (saved) process.env.GEMINI_API_KEY = saved;
  }
});
test('GitHub pagination, partial file errors, and rate limits (mocked network)', async () => {
  const original = globalThis.fetch;
  const pages = [];
  globalThis.fetch = async (url) => {
    pages.push(url);
    return new Response(
      JSON.stringify(
        new URL(url).searchParams.get('page') === '1'
          ? Array.from({ length: 100 }, (_, i) => ({
              name: `repo${i}`,
              owner: { login: 'mannansheth' },
              html_url: `https://github.com/mannansheth/repo${i}`,
            }))
          : [],
      ),
      { status: 200 },
    );
  };
  try {
    const result = await discover();
    assert.equal(result.repositories.length, 100);
    assert.equal(pages.length, 2);
    globalThis.fetch = async (url) => {
      if (url.endsWith('/languages')) return new Response('{}', { status: 500 });
      if (url.includes('/git/trees/'))
        return new Response(
          JSON.stringify({
            tree: [
              { path: '.env', size: 20, type: 'blob' },
              { path: 'server.js', size: 100, type: 'blob' },
            ],
          }),
        );
      if (url.endsWith('/readme')) return new Response('{}', { status: 404 });
      if (url.includes('/contents/'))
        return new Response(
          JSON.stringify({
            encoding: 'base64',
            content: Buffer.from(
              'const secret="private";\napp.get("/projects", handler);',
            ).toString('base64'),
          }),
        );
      return new Response(
        JSON.stringify({
          default_branch: 'main',
          html_url: payload.repositoryUrl,
          private: false,
        }),
      );
    };
    const result2 = await inspect(payload.repositoryUrl);
    assert.equal(result2.warnings.length, 2);
    assert.equal(result2.files.length, 1);
    assert.equal(result2.files[0].text.includes('private'), false);
    globalThis.fetch = async () =>
      new Response('{}', {
        status: 403,
        headers: { 'x-ratelimit-reset': '1900000000', 'x-ratelimit-remaining': '0' },
      });
    await assert.rejects(discover(), (e) => e.status === 429);
  } finally {
    globalThis.fetch = original;
  }
});
test('Gemini structured output validation and provider errors (mocked network)', async () => {
  const original = globalThis.fetch,
    key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  const evidence = {
    repo: 'Example',
    owner: 'example',
    url: payload.repositoryUrl,
    homepage: '',
    files: [{ path: 'README.md', text: 'Project summary.' }],
  };
  try {
    let requestBody;
    globalThis.fetch = async (url, options) => {
      assert.match(url, /generativelanguage.googleapis.com/);
      requestBody = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(validDraft('Example')),
                  },
                ],
              },
            },
          ],
        }),
      );
    };
    const draft = await generateDraft(evidence);
    assert.equal(draft.status, 'draft');
    assert.equal(draft.title, 'Example');
    assert.equal(draft.claimEvidence[0].sources[0], 'README.md');
    assert.ok(draft.missingInformation.some((item) => item.includes('individual role')));
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"title":44}' }] } }],
        }),
      );
    await assert.rejects(generateDraft(evidence), /validation/);
    globalThis.fetch = async () => new Response('{}', { status: 401 });
    await assert.rejects(generateDraft(evidence), /API key/);
    globalThis.fetch = async () => new Response('{}', { status: 404 });
    await assert.rejects(generateDraft(evidence), /model.*unavailable.*HTTP 404/);
    globalThis.fetch = async () => new Response('{}', { status: 429 });
    await assert.rejects(
      generateDraft(evidence),
      (error) => error.status === 429 && /quota/.test(error.message),
    );
  } finally {
    globalThis.fetch = original;
    if (key) process.env.GEMINI_API_KEY = key;
    else delete process.env.GEMINI_API_KEY;
  }
});
test('Gemini filtering removes development tasks from recruiter-facing features', async () => {
  const original = globalThis.fetch,
    key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  const draft = {
    ...validDraft('Feature filtering'),
    features: ['npm run test in watch mode', 'A meaningful project route'],
    claimEvidence: [
      ...validDraft('Feature filtering').claimEvidence,
      {
        section: 'features',
        claim: 'npm run test in watch mode',
        sources: ['README.md'],
      },
      {
        section: 'features',
        claim: 'A meaningful project route',
        sources: ['README.md'],
      },
    ],
  };
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }],
      }),
    );
  try {
    const result = await generateDraft({
      repo: 'FeatureFiltering',
      owner: 'example',
      url: 'https://github.com/example/feature-filtering',
      files: [{ path: 'README.md', text: 'Project notes.' }],
    });
    assert.deepEqual(result.features, ['A meaningful project route']);
    assert.equal(result.claimEvidence.filter((item) => item.section === 'features').length, 1);
    assert.ok(result.missingInformation.some((item) => /development-tool details/.test(item)));
  } finally {
    globalThis.fetch = original;
    if (key) process.env.GEMINI_API_KEY = key;
    else delete process.env.GEMINI_API_KEY;
  }
});
test('private GitHub discovery, inspection, Gemini consent, and publication privacy', async () => {
  const original = globalThis.fetch,
    token = process.env.GITHUB_TOKEN,
    key = process.env.GEMINI_API_KEY;
  const privateUrl = 'https://github.com/example/private-project';
  const calls = [];
  process.env.GITHUB_TOKEN = 'private-test-placeholder';
  process.env.GEMINI_API_KEY = 'gemini-test-placeholder';
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.includes('generativelanguage.googleapis.com'))
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(validDraft('Reviewed private project', 'server.js')),
                  },
                ],
              },
            },
          ],
        }),
      );
    assert.equal(options.headers.Authorization, 'Bearer private-test-placeholder');
    if (url.includes('/user/repos?'))
      return new Response(
        JSON.stringify([
          {
            name: 'private-project',
            private: true,
            owner: { login: 'example' },
            html_url: privateUrl,
          },
        ]),
      );
    if (url.endsWith('/languages')) return new Response('{"JavaScript":100}');
    if (url.includes('/git/trees/'))
      return new Response(
        JSON.stringify({
          tree: [
            { path: 'server.js', type: 'blob', size: 100 },
            { path: '.env', type: 'blob', size: 20 },
          ],
        }),
      );
    if (url.endsWith('/readme')) return new Response('{}', { status: 404 });
    if (url.includes('/contents/'))
      return new Response(
        JSON.stringify({
          encoding: 'base64',
          content: Buffer.from('const password="hidden";\napp.get("/projects", handler);').toString(
            'base64',
          ),
        }),
      );
    return new Response(
      JSON.stringify({ private: true, default_branch: 'main', html_url: privateUrl }),
    );
  };
  try {
    const found = await admin('get', '/api/admin/github/repositories?source=accessible');
    assert.equal(found.status, 200);
    assert.equal(found.body.data.repositories[0].private, true);
    assert.ok(calls.some((url) => url.includes('/user/repos?')));
    const inspected = await admin('post', '/api/admin/github/inspect', { url: privateUrl });
    assert.equal(inspected.status, 200);
    assert.equal(inspected.body.data.private, true);
    assert.equal(inspected.body.data.files[0].text.includes('hidden'), false);
    const before = calls.filter((url) => url.includes('generativelanguage')).length;
    assert.equal(
      (await admin('post', '/api/admin/github/generate', { url: privateUrl })).status,
      400,
    );
    assert.equal(calls.filter((url) => url.includes('generativelanguage')).length, before);
    const generated = await admin('post', '/api/admin/github/generate', {
      url: privateUrl,
      allowPrivateSource: true,
    });
    assert.equal(generated.status, 200);
    assert.equal(generated.body.data.repositoryPrivate, true);
    assert.equal(generated.body.data.status, 'draft');
    assert.deepEqual(generated.body.data.sourcePaths, ['server.js']);
    let saved = (await admin('post', '/api/admin/projects', generated.body.data)).body.data;
    assert.equal((await request(app).get(`/api/projects/${saved.slug}`)).status, 404);
    assert.equal(
      (await admin('put', `/api/admin/projects/${saved.id}`, { ...saved, status: 'published' }))
        .status,
      400,
    );
    saved = (
      await admin('put', `/api/admin/projects/${saved.id}`, {
        ...saved,
        status: 'published',
        privatePublicationApproved: true,
      })
    ).body.data;
    const publicData = (await request(app).get(`/api/projects/${saved.slug}`)).body.data;
    assert.equal(publicData.repositoryUrl, '');
    assert.equal(publicData.githubRepo, '');
    assert.equal(publicData.githubOwner, '');
    assert.equal('privatePublicationApproved' in publicData, false);
    assert.equal('claimEvidence' in publicData, false);
    assert.equal('sourcePaths' in publicData, false);
    saved = (
      await admin('put', `/api/admin/projects/${saved.id}`, {
        ...saved,
        status: 'draft',
        repositoryPrivate: false,
      })
    ).body.data;
    assert.equal(saved.repositoryPrivate, true);
    await admin('delete', `/api/admin/projects/${saved.id}`, { version: saved.version });
    const formerPublic = (
      await admin('post', '/api/admin/projects', {
        title: 'Previously public',
        slug: 'formerly-public',
        repositoryUrl: privateUrl,
        status: 'published',
      })
    ).body.data;
    const refresh = await admin('post', `/api/admin/projects/${formerPublic.id}/refresh`, {});
    assert.equal(refresh.status, 200);
    assert.equal(refresh.body.data.publicationChanged, true);
    assert.equal((await request(app).get('/api/projects/formerly-public')).status, 404);
    const refreshed = (await admin('get', '/api/admin/projects')).body.data.find(
      (p) => p.id === formerPublic.id,
    );
    assert.equal(refreshed.repositoryPrivate, true);
    assert.equal(refreshed.version, formerPublic.version + 1);
    await admin('delete', `/api/admin/projects/${refreshed.id}`, { version: refreshed.version });
    delete process.env.GITHUB_TOKEN;
    assert.equal(
      (await admin('get', '/api/admin/github/repositories?source=accessible')).status,
      503,
    );
  } finally {
    globalThis.fetch = original;
    if (token) process.env.GITHUB_TOKEN = token;
    else delete process.env.GITHUB_TOKEN;
    if (key) process.env.GEMINI_API_KEY = key;
    else delete process.env.GEMINI_API_KEY;
  }
});
test('logout invalidates server-side session', async () => {
  assert.equal((await admin('post', '/api/auth/logout', {})).status, 200);
  assert.equal((await admin('get', '/api/admin/projects')).status, 401);
});
