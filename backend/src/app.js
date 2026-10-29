import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { config } from './config.js';
import { query, pool } from './db.js';
import { HttpError, profileSchema, contactSchema } from './validation.js';
import { requireAdmin, hash, random, setSession, cookieToken } from './auth.js';
import { projectRow, listProjects, saveProject } from './projects.js';
import { contributions, discover, inspect, parseRepository } from './github.js';
import { generateDraft } from './ai.js';
import {
  getPublicProfile,
  getPublicProjects,
  getPublicProject,
  refreshAfterPublicWrite,
} from './public-content-cache.js';
export const app = express();
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", 'https:', 'data:'],
        upgradeInsecureRequests: config.forceHttps ? [] : null,
      },
    },
  }),
);
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, config.frontendOrigins.includes(origin) ? origin : false),
    credentials: true,
  }),
);
app.use(express.json({ limit: '180kb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    !config.frontendOrigins.includes(req.headers.origin)
  )
    return next(new HttpError(403, 'Request origin is not allowed.'));
  next();
});
const limited = (limit, windowMs) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });
app.get('/api/health', async (req, res) => {
  await query('SELECT 1');
  res.json({ data: { status: 'ok' } });
});
app.get('/api/profile', async (req, res) => {
  res.json({ data: await getPublicProfile() });
});
app.get('/api/projects', async (req, res) => res.json({ data: await getPublicProjects() }));
app.get('/api/github/contributions', limited(20, 60000), async (req, res) => {
  const username = z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/)
    .default('mannansheth')
    .parse(req.query.username);
  res.json({ data: await contributions(username) });
});
app.get('/api/projects/:slug', async (req, res) => {
  const project = await getPublicProject(req.params.slug);
  if (!project) throw new HttpError(404, 'Project not found.');
  res.json({ data: project });
});
app.post('/api/contact', limited(5, 15 * 60 * 1000), async (req, res) => {
  const p = contactSchema.parse(req.body);
  if (p.website)
    return res.status(201).json({
      data: { message: 'Thank you. Your message has been received.' },
    });
  const result = await query('INSERT INTO contacts (name,email,message) VALUES (?,?,?)', [
    p.name,
    p.email,
    p.message,
  ]);
  if (process.env.SMTP_HOST && process.env.CONTACT_TO && process.env.CONTACT_FROM) {
    try {
      await nodemailer
        .createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_PORT === '465',
          connectionTimeout: 10000,
          socketTimeout: 15000,
          ...(process.env.SMTP_USER
            ? {
                auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASSWORD,
                },
              }
            : {}),
        })
        .sendMail({
          from: process.env.CONTACT_FROM,
          to: process.env.CONTACT_TO,
          replyTo: p.email,
          subject: 'New portfolio contact',
          text: `${p.name} <${p.email}>\n\n${p.message}`,
        });
      await query("UPDATE contacts SET delivery_status='sent' WHERE id=?", [result.insertId]);
    } catch {
      await query("UPDATE contacts SET delivery_status='failed' WHERE id=?", [result.insertId]);
    }
  }
  res.status(201).json({ data: { message: 'Thank you. Your message has been received.' } });
});
app.post('/api/auth/login', limited(10, 15 * 60 * 1000), async (req, res) => {
  const p = z.object({ email: z.email(), password: z.string().min(1).max(200) }).parse(req.body);
  const rows = await query('SELECT * FROM administrators WHERE email=?', [p.email.toLowerCase()]);
  const fallback = '$2b$12$8DT.x6mqecEjNWIjepCW6uOoNUSmqcytfTIUGsjkn84CWTvy4EOY2';
  const valid = await bcrypt.compare(p.password, rows[0]?.password_hash || fallback);
  if (!rows.length || !valid) throw new HttpError(401, 'Email or password is incorrect.');
  const token = random(),
    csrf = random();
  await query('DELETE FROM sessions WHERE expires_at<NOW()');
  await query(
    'INSERT INTO sessions (token_hash,administrator_id,csrf_token,expires_at) VALUES (?,?,?,DATE_ADD(NOW(), INTERVAL 8 HOUR))',
    [hash(token), rows[0].id, csrf],
  );
  setSession(res, token);
  res.json({ data: { email: rows[0].email, csrfToken: csrf } });
});
app.get('/api/auth/session', requireAdmin, (req, res) =>
  res.json({
    data: { email: req.admin.email, csrfToken: req.admin.csrf_token },
  }),
);
app.post('/api/auth/logout', requireAdmin, async (req, res) => {
  await query('DELETE FROM sessions WHERE token_hash=?', [hash(cookieToken(req))]);
  res.clearCookie('portfolio_session', {
    path: '/',
    secure: config.secureCookies,
    httpOnly: true,
    sameSite: 'strict',
  });
  res.json({ data: { success: true } });
});
app.use('/api/admin', requireAdmin);
async function saveProjectAndRefresh(body, id) {
  const project = await saveProject(body, id);
  await refreshAfterPublicWrite();
  return project;
}
app.get('/api/admin/projects', async (req, res) => res.json({ data: await listProjects() }));
app.post('/api/admin/projects', async (req, res) =>
  res.status(201).json({ data: await saveProjectAndRefresh(req.body) }),
);
app.put('/api/admin/projects/:id', async (req, res) =>
  res.json({ data: await saveProjectAndRefresh(req.body, Number(req.params.id)) }),
);
app.delete('/api/admin/projects/:id', async (req, res) => {
  const version = z.number().int().positive().parse(req.body.version);
  const result = await query('DELETE FROM projects WHERE id=? AND version=?', [
    req.params.id,
    version,
  ]);
  if (!result.affectedRows)
    throw new HttpError(409, 'Project changed or was deleted. Reload before deleting.');
  await refreshAfterPublicWrite();
  res.json({ data: { success: true } });
});
app.post('/api/admin/reorder', async (req, res) => {
  const items = z
    .array(
      z.object({
        id: z.number().int().positive(),
        version: z.number().int().positive(),
      }),
    )
    .max(500)
    .parse(req.body.items);
  if (new Set(items.map((x) => x.id)).size !== items.length)
    throw new HttpError(400, 'Duplicate project in ordering.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [position, item] of items.entries()) {
      const [r] = await connection.execute(
        'UPDATE projects SET position=?,version=version+1 WHERE id=? AND version=?',
        [position, item.id, item.version],
      );
      if (!r.affectedRows) throw new HttpError(409, 'Projects changed. Reload before reordering.');
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  await refreshAfterPublicWrite();
  res.json({ data: await listProjects() });
});
app.put('/api/admin/profile', async (req, res) => {
  const p = profileSchema.parse(req.body);
  if (!p.version) throw new HttpError(400, 'A content version is required.');
  const result = await query(
    'UPDATE profile SET data=?,version=version+1 WHERE id=1 AND version=?',
    [JSON.stringify(p), p.version],
  );
  if (!result.affectedRows) throw new HttpError(409, 'Profile changed. Reload before editing.');
  await refreshAfterPublicWrite();
  res.json({ data: { ...p, version: p.version + 1 } });
});
app.get('/api/admin/contacts', async (req, res) =>
  res.json({
    data: await query('SELECT * FROM contacts ORDER BY id DESC LIMIT 200'),
  }),
);
app.get('/api/admin/github/repositories', limited(20, 60000), async (req, res) => {
  const source = z.enum(['public', 'accessible']).parse(req.query.source || 'public');
  const result = await discover('mannansheth', source);
  const imported = await query(
    'SELECT repository_key,id FROM projects WHERE repository_key IS NOT NULL',
  );
  res.json({
    data: {
      ...result,
      repositories: result.repositories.map((r) => ({
        ...r,
        importedId: imported.find((p) => p.repository_key === `${r.owner}/${r.name}`.toLowerCase())
          ?.id,
      })),
    },
  });
});
app.post('/api/admin/github/inspect', limited(10, 60000), async (req, res) => {
  const url = z.string().max(2000).parse(req.body.url);
  const evidence = await inspect(url);
  const imported = await query('SELECT id FROM projects WHERE repository_key=?', [
    `${evidence.owner}/${evidence.repo}`.toLowerCase(),
  ]);
  res.json({ data: { ...evidence, importedId: imported[0]?.id } });
});
app.post('/api/admin/github/generate', limited(5, 60000), async (req, res) => {
  if (!process.env.GEMINI_API_KEY)
    throw new HttpError(
      503,
      'Gemini generation is not configured. Add GEMINI_API_KEY and GEMINI_MODEL to backend/.env. You can still import and edit repository metadata.',
    );
  const evidence = await inspect(z.string().max(2000).parse(req.body.url));
  if (evidence.private && req.body.allowPrivateSource !== true)
    throw new HttpError(
      400,
      'This repository is private. Review the selected evidence and explicitly allow sending it to Gemini before generating a draft.',
    );
  if (!evidence.files.length)
    throw new HttpError(
      422,
      'No safe documentation or source files were available to analyze. Use repository metadata and add project details manually.',
    );
  res.json({ data: await generateDraft(evidence) });
});
app.post('/api/admin/projects/:id/refresh', limited(10, 60000), async (req, res) => {
  const rows = await query('SELECT * FROM projects WHERE id=?', [req.params.id]);
  if (!rows.length) throw new HttpError(404, 'Project not found.');
  const p = projectRow(rows[0]);
  parseRepository(p.repositoryUrl);
  const evidence = await inspect(p.repositoryUrl);
  if (evidence.private && !p.repositoryPrivate) {
    p.repositoryPrivate = true;
    p.privatePublicationApproved = false;
    p.status = 'draft';
    const changed = await query(
      "UPDATE projects SET evidence=?,data=?,status='draft',version=version+1 WHERE id=? AND version=?",
      [JSON.stringify(evidence), JSON.stringify(p), p.id, p.version],
    );
    if (!changed.affectedRows)
      throw new HttpError(409, 'Project changed. Reload before refreshing.');
    evidence.publicationChanged = true;
  } else await query('UPDATE projects SET evidence=? WHERE id=?', [JSON.stringify(evidence), p.id]);
  await refreshAfterPublicWrite();
  res.json({ data: evidence });
});
if (config.production) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  app.use(
    express.static(root, {
      setHeaders(res, filePath) {
        if (path.basename(filePath) === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/[\\/]assets[\\/]/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    }),
  );
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(root, 'index.html'));
  });
}
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return res.status(400).json({
      error: 'Please check the form fields.',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  if (err.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ error: 'This slug or repository has already been used.' });
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid JSON request.' });
  if (err.type === 'entity.too.large')
    return res.status(413).json({ error: 'Request is too large.' });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error('Request failed:', err.code || err.name);
  res.status(503).json({
    error: 'Service unavailable. Check the database connection and retry.',
  });
});
