import crypto from 'node:crypto';
import { query } from './db.js';
import { HttpError } from './validation.js';
import { config } from './config.js';
export const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const random = () => crypto.randomBytes(32).toString('hex');
export function cookieToken(req) {
  return (req.headers.cookie || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('portfolio_session='))
    ?.slice(18);
}
export async function requireAdmin(req, res, next) {
  try {
    const token = cookieToken(req);
    if (!token) throw new HttpError(401, 'Please sign in.');
    const rows = await query(
      'SELECT s.*, a.email FROM sessions s JOIN administrators a ON a.id=s.administrator_id WHERE token_hash=? AND expires_at>NOW()',
      [hash(token)],
    );
    if (!rows.length) throw new HttpError(401, 'Your session expired. Please sign in.');
    req.admin = rows[0];
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const sent = req.headers['x-csrf-token'];
      if (
        typeof sent !== 'string' ||
        sent.length !== req.admin.csrf_token.length ||
        !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(req.admin.csrf_token))
      )
        throw new HttpError(403, 'Invalid security token. Reload and try again.');
    }
    next();
  } catch (e) {
    next(e);
  }
}
export function setSession(res, token) {
  res.cookie('portfolio_session', token, {
    httpOnly: true,
    secure: config.production,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
}
