# Production deployment

Use Node.js 22.12+ and MySQL 8+ (also verified against MariaDB 10.4). Build from the lockfile:

```powershell
npm.cmd ci
npm.cmd run build
```

Create a production database with `utf8mb4`, then fill `backend/.env` using the template. Use a dedicated database user. For schema initialization it needs CREATE; runtime requires SELECT, INSERT, UPDATE and DELETE on the portfolio database. After running `npm.cmd run setup`, remove CREATE from the runtime user. Keep secrets outside version control and limit file access. No static admin password or session signing secret is used: sessions are opaque random tokens whose hashes live in MySQL.

```powershell
npm.cmd run setup
npm.cmd run admin
$env:NODE_ENV = 'production'
$env:FRONTEND_ORIGIN = 'https://your-domain.example'
npm.cmd run start -w backend
```

Production Express serves `frontend/dist`, including SPA routes such as `/work/curatus` and `/admin`. Place it behind an HTTPS reverse proxy and a process manager with automatic restart. Bind/firewall the API so only the proxy can access it; keep MySQL private. Set `TRUST_PROXY=1` only when requests come through one trusted proxy, which must overwrite `X-Forwarded-For`. Use the exact public origin (without trailing slash). Cookies are HTTP-only, SameSite=Strict and Secure in production; admin login therefore requires HTTPS. A separate frontend deployment must reverse proxy `/api` to this backend on the same origin; this avoids cross-site cookie issues.

Example nginx configuration (replace domain and certificate paths):

```nginx
server {
    listen 443 ssl;
    server_name your-domain.example;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    client_max_body_size 200k;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 120s;
    }
}
server {
    listen 80;
    server_name your-domain.example;
    return 301 https://$host$request_uri;
}
```

Back up MySQL regularly, including content and contact records. Restore into a separate database and verify before replacing production. Sessions expire after eight hours and expired rows are cleaned on login. Delete expired session rows periodically if needed. Apply a retention policy for contact messages directly in the database; the inbox shows the newest 200 records. Monitor `/api/health`, process logs, and SMTP failure statuses in the admin inbox.

This deployment is deliberately a single Express service with one database. In-memory abuse limits suit that deployment. Multiple API instances require a shared rate-limit store and correct proxy configuration. Use a managed database, durable volumes, and restricted access if deploying in containers.

Images and resume files use hosted URLs; uploads are not implemented. Google Fonts has system-font fallbacks if external font loading is blocked. You can self-host the fonts and remove the CSS import for a deployment without third-party font requests.

Gemini credentials and SMTP are optional. Enabling them does not require rebuilding the frontend. Restart Express after environment changes. The Gemini REST request uses Google's `generateContent` API with JSON-schema output and server-side validation; see [Google structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output). Confirm the configured model is available to your account.
