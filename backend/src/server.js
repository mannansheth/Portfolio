import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
const server = app.listen(config.port, () =>
  console.log(`Portfolio API: http://127.0.0.1:${config.port}`),
);
process.on('SIGINT', () =>
  server.close(async () => {
    await pool.end();
    process.exit(0);
  }),
);
