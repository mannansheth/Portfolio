import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
export const config = {
  port: Number(process.env.PORT || 3001),
  origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173',
  production: process.env.NODE_ENV === 'production',
};
