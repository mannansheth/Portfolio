# Mannan Sheth — Portfolio

A complete editorial portfolio with React/Vite, Express, and MySQL. Warm paper, restrained rust accents, asymmetric project essays, responsive navigation, and a protected content-management workspace.

Public pages include Home, Work, individual project notes, About, and Contact. The admin provides project CRUD, draft/published status, homepage features, ordering, preview, profile editing, a contact inbox, public and private GitHub discovery/inspection, and reviewed Gemini-generated drafts. All portfolio content comes from the backend database.

## Run on this Windows device

Dependencies and the database schema are already installed. The local `backend/.env` points to the running XAMPP MariaDB server at `127.0.0.1:3306` with `DB_USER=root` and an empty local password. Credentials are kept in the ignored `backend/.env`; `backend/.env.example` contains placeholders. Existing administrator accounts and content are preserved.

From this folder in PowerShell:

```powershell
npm.cmd run admin
npm.cmd run dev
```

If you already created your administrator, skip the first command. Otherwise enter your email and a hidden password of 12+ characters (at most 72 UTF-8 bytes). Then open **http://127.0.0.1:5175** and **http://127.0.0.1:5175/admin**. The API is at `http://127.0.0.1:3001`. Use `127.0.0.1` consistently instead of mixing it with `localhost` because the CORS origin is exact.

The Vite dev server listens on the local network at port `5175`. To open it from a phone on the same Wi-Fi, use the computer's current IPv4 address shown by `ipconfig` (for example, `http://<IPv4-address>:5175`). If needed, add that URL to the comma-separated `FRONTEND_ORIGINS` value in the ignored `backend/.env`, then restart the dev command. Keep the phone and computer on the same non-isolated Wi-Fi network.

## Reproducible setup on another device

Requirements: Node.js 22.12+ (Node 24 LTS also suitable), npm, and MySQL 8+ or MariaDB 10.4+. Use `npm.cmd` in PowerShell if the execution policy blocks `npm.ps1`.

```powershell
npm.cmd ci
Copy-Item backend/.env.example backend/.env
```

Create a database using MySQL Workbench or the MySQL client:

```sql
CREATE DATABASE portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'portfolio'@'localhost' IDENTIFIED BY 'REPLACE_WITH_YOUR_OWN_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON portfolio.* TO 'portfolio'@'localhost';
```

Fill `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `backend/.env` to match your database. Then:

```powershell
npm.cmd run setup
npm.cmd run admin
npm.cmd run dev
```

`setup` creates tables and seeds missing content. It is repeatable and preserves existing edits. Schema is in `backend/schema.sql`; seed content and its sources are in `backend/data/`. Six source-backed projects are available: **Curatus, Pathfinder, AdaptQ, Wordle Clone, Reportr, and RecipeVerse**. The first three are featured on the homepage; all six are available from Work. Personal email, employment, and resume details remain blank because they were not verified. Add them under **Profile & links** if you want them displayed. Missing optional links and sections are hidden.

## Gemini configuration

Gemini is the only AI provider used. Get an API key from Google AI Studio and fill:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
```

Restart the backend. The model is configurable; choose a model available to your account that supports JSON-schema generation. No AI key is required for public pages, content editing, contacts, or metadata imports. Missing credentials show a configuration message. No fake output is substituted.

Temporary Gemini HTTP 500/502/503/504 responses are retried up to three attempts per model with exponential backoff and jitter. If temporary failures persist, `GEMINI_FALLBACK_MODEL` is tried using the same evidence and validation, within one shared 90-second budget. Leave the fallback blank to disable it. Long `Retry-After` delays are respected rather than retried early. Authentication, model-access, and quota errors do not trigger fallback. A provider-wide outage still requires waiting; content is preserved. Generation responses include `generationModel` to identify which model produced the draft.

In **GitHub import**, browse repositories or paste a public or token-accessible private URL, inspect selected files, and generate a draft or start with metadata. Edit the result and save as draft or explicitly publish after review. Already-imported repositories open their existing project. **Refresh evidence** preserves manual text. **Generate / regenerate** creates a separate candidate; replacing descriptive fields is explicit and does not save automatically. Individual contribution and publication settings are preserved.

Source retrieval is bounded to small allowlisted text files, selected by README/manifests/routes/models priority, excluding environment files, credentials/configuration, dependencies and generated assets. Source is filtered for common secret patterns before display or transmission, capped at 45,000 source characters, and treated as untrusted data by the generation prompt. Secret detection is heuristic; inspect the preview before using AI on an unfamiliar repository. Private source is sent to Gemini only after the admin explicitly selects the consent checkbox. Database and SMTP configuration are never included.

## GitHub configuration

Public access works without a token. Anonymous GitHub REST access has a low shared rate limit. For more capacity or private imports, fill `GITHUB_TOKEN` in the backend environment. Use a fine-grained GitHub personal access token restricted to your selected repositories with **Contents: read-only** and **Metadata: read-only**. Organization repositories may require organization approval. No write permission or GitHub App is required. Restart the backend after changing the token.

In **GitHub import**, choose **Browse token-accessible repositories** and filter by private visibility, or paste a repository URL. Private evidence stays behind admin authentication. Before generating, explicitly approve sending the selected private source to Gemini. Imports start as drafts; publication requires a separate approval checkbox for making the portfolio description public. Private repository URLs and owner/name metadata are hidden from public APIs and pages. Refreshing a project whose repository has become private moves it back to draft without replacing your text. The importer handles pagination, rate limits, missing README/language/files, incomplete trees, and duplicate repository keys. Only selected repositories are saved, and Gemini generation never auto-publishes.

## Theme

The header and admin workspace include a light/dark toggle. The initial theme follows your system preference; an explicit choice persists across pages, reloads, and browser tabs. Both themes support mobile navigation and visible keyboard focus.

## Contact delivery

Messages are always validated and stored in MySQL, then visible under **Messages**. To also send email, fill `SMTP_HOST`, `SMTP_PORT`, optional `SMTP_USER` and `SMTP_PASSWORD`, `CONTACT_FROM`, and `CONTACT_TO`. Port 465 uses implicit TLS; port 587 uses STARTTLS where supported. Use a verified sender address. If SMTP fails, storage succeeds and the admin inbox shows `failed`. A success confirmation means the submission was stored, not that an email was delivered.

## Verification commands

```powershell
npm.cmd run check
npm.cmd test
npm.cmd audit
# With both services running; installs browser once if needed:
npx.cmd playwright install chromium
npm.cmd run test:browser
npm.cmd run test:theme-private
```

`check` runs backend syntax checks and a production frontend build. Backend integration tests create an isolated random test database and delete it afterwards; the testing user needs CREATE/DROP DATABASE privileges. To use separate test credentials, set `$env:DB_USER` and `$env:DB_PASSWORD` before `npm.cmd test`. Browser checks use the running local portfolio and temporary random admin credentials, projects and contacts; temporary records are removed in `finally`. Screenshots are written to ignored `.local/screenshots/`. Run browser checks against the seeded local instance, since the script expects the three initial projects.

Database-backed tests verify login/logout, cookie flags, authorization/CSRF, origin restrictions, contact validation/storage, project CRUD/publication/ordering, duplicate detection, concurrent editing, and profile changes. Network-mocked tests verify GitHub pagination, individual-file failures and rate limits, Gemini structured output, validation and provider errors. Browser verification covers navigation, responsive overflow checks, project rendering, contact submission and admin editing.

Live Wordle and Curatus drafts passed structured validation with `gemini-3.5-flash-lite`; Curatus also passed with the configured fallback. Generated descriptions still require your review. All 14 backend tests passed, as did desktop/mobile dark-mode and private-import browser checks. The configured GitHub token discovered 20 accessible repositories, including 6 private repositories; private source inspection passed without sending it to Gemini or publishing it. SMTP delivery still requires credentials and has not been tested. Real GitHub discovery, source inspection, and metadata import passed in the browser. Rate-limit handling and multi-page pagination were also tested using controlled responses. Production SPA serving and secure-cookie configuration passed local checks. See [verification details](docs/VERIFICATION.md).

## Project structure

```text
frontend/src/       React pages, reusable components, CSS, centralized API client
frontend/src/admin/ Authentication UI, project editor, GitHub workflow, content panels
backend/src/        Express API, validation, authentication, database, GitHub, Gemini
backend/scripts/    Repeatable schema/seed setup and hidden-password admin creation
backend/data/       Editable initial seed and source-evidence notes
backend/test/       Database-backed and mocked-network integration tests
scripts/            Browser verification and optional initial research helper
docs/               REST API, deployment and verification guides
```

Sessions use 256-bit random opaque tokens, stored as SHA-256 hashes in MySQL. Passwords use bcrypt with cost 12. Admin mutations use per-session CSRF tokens and optimistic content versions. SQL is parameterized; raw HTML is never rendered. Images use validated hosted URLs, so upload handling is unnecessary.

For production, run `npm.cmd run build`, set `NODE_ENV=production`, the HTTPS `FRONTEND_ORIGIN`, and dedicated database credentials, then `npm.cmd run start -w backend`. Express serves the frontend build and API together. See [deployment guide](docs/DEPLOYMENT.md) and [REST API](docs/API.md). This workspace was not deployed to external hosting.
