import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
const origin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173';
const frontendOrigins = [
  origin,
  ...(process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
];
export const config = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '127.0.0.1',
  frontendOrigins: [...new Set(frontendOrigins)],
  production: process.env.NODE_ENV === 'production',
};
