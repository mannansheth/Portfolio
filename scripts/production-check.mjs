import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
process.env.NODE_ENV = 'production';
process.env.FRONTEND_ORIGIN = 'https://portfolio.example';
const { app } = await import('../backend/src/app.js');
const { query, pool } = await import('../backend/src/db.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const email = `production-${crypto.randomBytes(6).toString('hex')}@example.com`,
  password = crypto.randomBytes(20).toString('hex');
try {
  for (const path of ['/', '/work/curatus', '/admin']) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /<div id="root"><\/div>/);
    assert.match(r.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  }
  const projects = await (await fetch(base + '/api/projects')).json();
  assert.ok(projects.data.length > 0);
  assert.equal('missingInformation' in projects.data[0], false);
  const unknown = await fetch(base + '/api/not-found');
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type'), /application\/json/);
  await query('INSERT INTO administrators (email,password_hash) VALUES (?,?)', [
    email,
    await bcrypt.hash(password, 12),
  ]);
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: process.env.FRONTEND_ORIGIN },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /Secure/);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  console.log(
    'Production checks passed: built SPA routes, JSON API/404, private review-note exclusion, HTTPS CSP, Secure/HTTP-only session cookies.',
  );
} finally {
  await query('DELETE FROM administrators WHERE email=?', [email]);
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
