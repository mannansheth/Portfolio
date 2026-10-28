import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
import { refreshPublicContentCache } from './public-content-cache.js';

void refreshPublicContentCache().catch(() => {
  console.warn('Public content cache could not warm; public requests will retry when the database is available.');
});

const server = app.listen(config.port, config.host, () =>
  console.log(`Portfolio API: http://${config.host}:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
