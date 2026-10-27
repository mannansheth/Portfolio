# Verification — 2026-10-04

The application was verified on Windows with Node.js 22.16, Chromium, and the existing XAMPP MariaDB 10.4.32 database using the MySQL driver. MariaDB compatibility was tested; an independent Oracle MySQL 8 server was not available.

## Passed

- Dependency installation and `npm audit`: zero reported vulnerabilities.
- Frontend production build with Vite; Express and Vite development startup; database health endpoint.
- Production Express serving for `/`, `/work/curatus`, and `/admin`; JSON API 404s, HTTPS CSP, Secure/HTTP-only cookie flags, and exclusion of private review notes from public project responses.
- Ten backend integration tests, using a separate disposable database: login/logout, HTTP-only and SameSite cookie flags, authorization, CSRF, restricted origins, CRUD, draft visibility, publication, unique slug/repository keys, stale-version rejection, transactional order updates, profile editing, contact validation and durable storage.
- Controlled GitHub responses: pagination, individual-file failures, exclusion and sanitization, rate-limit feedback.
- Controlled Gemini responses: native Gemini REST request, JSON-schema configuration, draft-only output, server validation failures, provider errors, missing-key feedback.
- Two additional retry tests: recovery after transient 503/502 responses, bounded attempts, `Retry-After` handling, and no retries for authentication, access, or quota errors. All 12 backend tests pass.
- A live draft generated from eight selected Pathfinder source files passed structured validation in 18 seconds. No content was saved or replaced; generated descriptions still require personal review.
- Wordle and Curatus drafts generated from real repository evidence passed validation using `gemini-3.5-flash-lite`. Curatus also passed with `gemini-3.1-flash-lite`. These are now the configured primary and fallback; credentials were preserved. Configured fallback behavior and rejection of fallback on access/quota errors are covered by an additional test. All 13 backend tests pass.
- Chromium browser navigation across Home, Work, Curatus details, About, and Contact.
- Browser admin workflow: login/logout, create, edit, preview, save draft, publish, verify public project, unpublish, delete.
- Actual public GitHub discovery returned all 13 repositories. The admin inspected Affinity using the real API, displayed selected evidence, and saved a metadata-based draft; the temporary record was removed. The anonymous API limit was also encountered during initial research and handled as a helpful error.
- Contact submission through the browser stored a message and showed confirmation. Temporary test messages and administrators were removed.
- Desktop (1440 px), mobile (390 px) screenshots and overflow checks. Public and admin mobile navigation were exercised. Default project imagery is explicitly labeled as concept diagrams, not application screenshots.

Screenshots are in ignored `.local/screenshots/`. Browser verification can be repeated with `npm.cmd run test:browser` while both development services are running. Its temporary records are cleaned even on assertion failures.

## Requires your configuration

Initial verification used controlled Gemini responses while credentials were blank. After a key was configured, a live diagnostic request to `gemini-2.5-flash` returned HTTP 404 despite appearing in model discovery. A live request to `gemini-3.8-flash` succeeded and its structured draft passed backend validation. That diagnostic preceded the current tested `gemini-3.5-flash-lite` primary and `gemini-3.1-flash-lite` fallback; no diagnostic content was saved. Full repository draft quality still requires manual review.

SMTP delivery was not tested because no mail host or credentials were supplied. Storage and confirmation work without email. Configure the SMTP fields and verify delivery to `CONTACT_TO`; failed delivery is recorded in the admin inbox.

No hosting deployment, HTTPS certificate, or real production proxy was configured. The production build and deployment guide are provided. Production Secure cookies require HTTPS.

LinkedIn, personal email, resume, employment, individual contributions, and unsupported project outcomes were not invented. Fill these using the admin. Initial project facts have a source record in `backend/data/sources.md`; code presence does not establish clinical results, successful deployments, or personal authorship.

## Private imports and dark mode

- All 14 backend tests passed, including token-accessible discovery, sanitized private inspection, explicit Gemini consent, guarded publication, hidden public repository identifiers, retained private classification, and public-to-private refresh returning to draft. Provider responses in this test are controlled.
- The configured token discovered 20 accessible repositories, including 6 private repositories. Live inspection retrieved 8 selected files from a private repository. No private names or source were logged, sent to Gemini, or published.
- Chromium checks passed for theme persistence across reloads and routes, initial system preference, mobile public/admin navigation, private import controls, publication approval, and hidden private links. GitHub responses in the browser test were mocked; saves and publication used the real API and temporary database records were removed.
- Run `npm.cmd run test:theme-private` with both development services running. Screenshots are in `.local/screenshots/`. Private Gemini generation was deliberately tested with controlled provider responses, without transmitting real private code.
