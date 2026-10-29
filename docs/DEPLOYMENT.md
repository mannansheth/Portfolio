# Production deployment

Use Node.js 24 LTS for container builds and MySQL 8+ (also verified against MariaDB 10.4). Build from the lockfile:

```powershell
npm.cmd ci
npm.cmd run build
```

## Docker image

The repository Dockerfile builds the React frontend and packages it with Express on Node.js 24 LTS. It uses a Debian Bookworm runtime, installs only production dependencies in the final image, and runs as the unprivileged `node` user. The app listens on port 3001 inside the container; publish that port on host loopback when Apache is the public reverse proxy. Runtime settings and credentials must be provided to the container at startup and are not copied into the image. The Docker build context excludes `.env` files, local research data, dependencies, and generated output.

Build and start the image with an environment file that points to the portfolio database:

```sh
docker build -t portfolio:latest .
docker run -d --name portfolio \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  --env-file /path/to/portfolio.env \
  -p 127.0.0.1:3001:3001 \
  portfolio:latest
```

The environment file must include `DB_HOST=host.docker.internal`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `FRONTEND_ORIGIN`, and `NODE_ENV=production`. `FORCE_HTTPS=1` enables CSP upgrades from HTTP to HTTPS and should only be set after HTTPS is configured; leave it unset or set it to `0` for an HTTP-only deployment. Production session cookies are Secure by default; `COOKIE_SECURE=0` disables that protection and should only be used temporarily when intentionally accepting public HTTP admin sessions. Remove the override once HTTPS is enabled. `HOST=0.0.0.0` is set in the image so the service is reachable through Docker's loopback-only host port mapping. Keep database credentials outside the image and repository. For a new database, initialize the schema with a database account that has temporary `CREATE` permission, then remove that permission from the runtime account. Do not run setup against an already imported production database without first checking its schema and contents. Check readiness with `docker inspect --format '{{.State.Health.Status}}' portfolio`; the health check requires a working database connection.

The current EC2 deployment runs Docker Engine on Amazon Linux 2. The portfolio container uses its own Debian Bookworm userspace and Node runtime; the existing .NET application remains a separate host service. Amazon Linux 2 is out of support, so plan an OS migration separately.

## GitHub Actions deployment

`.github/workflows/deploy-portfolio.yml` runs on relevant pushes to `main` or through manual workflow dispatch. It installs locked dependencies, runs backend tests and a production dependency audit, builds the frontend and an AMD64 Docker image, then transfers a compressed image archive to EC2 over SSH. Configure `SERVER_IP`, `SERVER_USER`, and `SSH_PRIVATE_KEY` as Actions secrets in the Portfolio repository. `SERVER_USER` should be `ec2-user`; `SSH_PRIVATE_KEY` is the private-key file contents used by the deployment. The workflow loads the image, starts a temporary candidate on `127.0.0.1:13002`, checks container and database health, then replaces only the `portfolio` container on `127.0.0.1:3001`. It reads the existing `/etc/portfolio/portfolio.env` file and never stops the .NET service or writes to `/var/www/html/Finance`.

This workflow deploys the portfolio service but does not expose it publicly. It remains reachable through an SSH tunnel until a portfolio hostname, HTTPS certificate, and additive Apache virtual host are configured.

Create a production database with `utf8mb4`, then fill `backend/.env` using the template. Use a dedicated database user. For schema initialization it needs CREATE; runtime requires SELECT, INSERT, UPDATE and DELETE on the portfolio database. After running `npm.cmd run setup`, remove CREATE from the runtime user. Keep secrets outside version control and limit file access. No static admin password or session signing secret is used: sessions are opaque random tokens whose hashes live in MySQL.

```powershell
npm.cmd run setup
npm.cmd run admin
$env:NODE_ENV = 'production'
$env:FRONTEND_ORIGIN = 'https://your-domain.example'
npm.cmd run start -w backend
```

Production Express serves `frontend/dist`, including SPA routes such as `/work/curatus` and `/admin`. It binds to `127.0.0.1:3001` by default (`PORT` and `HOST` are configurable). Place it behind an HTTPS reverse proxy and a process manager with automatic restart. Keep the API and MySQL ports private; the proxy should be the only path to Express. Set `TRUST_PROXY=1` only when requests come through one trusted proxy, which must overwrite `X-Forwarded-For`. Use the exact public origin (without trailing slash). Cookies are HTTP-only, SameSite=Strict and Secure in production; admin login therefore requires HTTPS. A separate frontend deployment must reverse proxy `/api` to this backend on the same origin; this avoids cross-site cookie issues.

Published profile and project records are cached in the Node process. The cache warms on startup and refreshes after admin content writes. On a routine refresh failure, the last known-good snapshot stays available and the cache retries later. After an admin write, public reads wait for a fresh snapshot so a deleted or unpublished project is not served from stale memory. This cache is process-local: run one Node process for this setup; multiple processes would need shared invalidation. Vite's hashed files under `assets/` receive a one-year immutable browser cache, `index.html` is revalidated, and other public files are cached for one hour.

Example Nginx configuration for hosts already using Nginx (replace domain and certificate paths):

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

On the existing portfolio EC2, diagnostics showed Apache (`httpd`) owns ports 80 and 443 and the .NET app listens on `127.0.0.1:5000`. Use an additive Apache virtual host for the portfolio after inspecting the active Apache virtual hosts and proxy modules. Do not install Nginx or replace the current .NET vhost as part of this deployment. The EC2's MariaDB listener was shown on all interfaces; verify its security-group and host-firewall ingress before proceeding, and use a separate portfolio database and user without changing the existing .NET database account or global database settings.

Back up MySQL regularly, including content and contact records. Restore into a separate database and verify before replacing production. Sessions expire after eight hours and expired rows are cleaned on login. Delete expired session rows periodically if needed. Apply a retention policy for contact messages directly in the database; the inbox shows the newest 200 records. Monitor `/api/health`, process logs, and SMTP failure statuses in the admin inbox.

This deployment is deliberately a single Express service with one database. In-memory abuse limits suit that deployment. Multiple API instances require a shared rate-limit store and correct proxy configuration. Use a managed database, durable volumes, and restricted access if deploying in containers.

Images and resume files use hosted URLs; uploads are not implemented. Google Fonts has system-font fallbacks if external font loading is blocked. You can self-host the fonts and remove the CSS import for a deployment without third-party font requests.

Gemini credentials and SMTP are optional. Enabling them does not require rebuilding the frontend. Restart Express after environment changes. The Gemini REST request uses Google's `generateContent` API with JSON-schema output and server-side validation; see [Google structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output). Confirm the configured model is available to your account.
