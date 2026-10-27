# REST API

All endpoints are prefixed with `/api`. Success returns `{ "data": ... }`; errors return `{ "error": "safe message", "details": [...] }`. Validation details are optional. Bodies use JSON. Public content is served from MySQL; unpublished projects return 404 to public callers. Unknown API routes return JSON 404s.

## Public

| Method | Path              | Responsibility                                                                                                                                     |
| ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`         | Checks database connectivity. Returns 503 if unavailable.                                                                                          |
| GET    | `/profile`        | Editable profile and its version.                                                                                                                  |
| GET    | `/projects`       | Published projects ordered by position and ID.                                                                                                     |
| GET    | `/projects/:slug` | Published project detail.                                                                                                                          |
| POST   | `/contact`        | Validates and stores `{ name, email, message, website? }`; `website` is the honeypot. Sends optional SMTP notification after storage. Returns 201. |

## Authentication

| Method | Path            | Responsibility                                                                          |
| ------ | --------------- | --------------------------------------------------------------------------------------- |
| POST   | `/auth/login`   | `{ email, password }`; sets HTTP-only session cookie and returns email plus CSRF token. |
| GET    | `/auth/session` | Validates session and returns CSRF token.                                               |
| POST   | `/auth/logout`  | Deletes the server-side session and clears the cookie.                                  |

Login is limited to 10 attempts per IP per 15 minutes. Contact is limited to 5 submissions per IP per 15 minutes. Rate limits are process-local: use one API instance or add a shared rate-limit store when scaling.

## Protected admin

Every endpoint below requires a valid session. Every mutation also requires `X-CSRF-Token` equal to the session token returned at login. Cross-origin mutations are rejected; credentialed CORS is restricted to `FRONTEND_ORIGIN` and any explicitly listed `FRONTEND_ORIGINS`.

| Method | Path                          | Responsibility                                                                                                                                                          |
| ------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/projects`             | Lists drafts and published projects.                                                                                                                                    |
| POST   | `/admin/projects`             | Creates a validated project; default status is draft.                                                                                                                   |
| PUT    | `/admin/projects/:id`         | Updates project; requires current `version`.                                                                                                                            |
| DELETE | `/admin/projects/:id`         | Deletes project; body `{ version }`.                                                                                                                                    |
| POST   | `/admin/reorder`              | `{ items: [{ id, version }, ...] }`; assigns sequential positions transactionally.                                                                                      |
| PUT    | `/admin/profile`              | Updates editable profile; requires current version.                                                                                                                     |
| GET    | `/admin/contacts`             | Latest 200 stored submissions and SMTP delivery status.                                                                                                                 |
| GET    | `/admin/github/repositories`  | `?source=public` (default): public discovery; `?source=accessible`: token-accessible public/private repositories, including imported IDs.                               |
| POST   | `/admin/github/inspect`       | `{ url }`; returns metadata, languages, selected sanitized source, warnings and any existing project ID.                                                                |
| POST   | `/admin/github/generate`      | `{ url, allowPrivateSource? }`; private source requires explicit `true`; inspects server-side and asks Gemini for a validated editable draft. Does not save or publish. |
| POST   | `/admin/projects/:id/refresh` | Refreshes evidence without replacing text. A public-to-private change moves the project to draft and increments its version.                                            |

Duplicate slugs and repository keys return 409. Stale edits, stale ordering, and stale deletes return 409. Reload the record before trying again. Authentication failure returns 401; invalid CSRF or origin returns 403; GitHub rate limits return 429; unavailable integrations return safe 502/503 messages.

## Content shape

Projects contain `title`, `slug`, `tagline`, `overview`, `problem`, `architecture`, `contribution`, `challenges`, `learnings`, string arrays `features`, `technologies`, and `connections`, `coverImage`, `images`, `repositoryUrl`, `demoUrl`, `githubOwner`, `githubRepo`, `status` (`draft` or `published`), `featured`, and `position`. `connections` groups projects into paths on the Work atlas; reusing a label joins an existing path, while a new label creates one. A project without a connection remains visible under “Needs a connection.” `repositoryPrivate` marks private imports; publishing them requires `privatePublicationApproved: true`. Public responses omit that approval and hide private repository URLs, owners, and names. Existing private classification cannot be removed through an ordinary edit. Optional private review arrays are `missingInformation` and `suggestedSections`. SQL columns are authoritative for publication, ordering and version.

Profile contains `name`, `introduction`, `interests`, `biography`, `location`, `graduationYear`, `education`, `experience`, `skills`, `github`, `linkedin`, `resumeUrl`, and `email`. URL fields accept HTTP/HTTPS only; empty optional fields are hidden on public pages. Content is rendered as text, without raw HTML or Markdown execution.
