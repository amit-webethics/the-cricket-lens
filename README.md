# The Cricket Lens

Next.js + TypeScript publication with a PostgreSQL editorial CMS. Brand: #33319c with white text.

## What is implemented

- `/admin/` overview, article and news lists, create/edit forms, previews, categories, authors, image uploads, website pages and site settings.
- Draft, published and archived status. Public queries only read published records. Save conflicts are detected using record revisions.
- Article sections and paragraphs, cover image/alt/credit, tags, authors, categories, verification sources, correction notes, SEO and social metadata.
- Short sourced cricket news updates feed the right homepage sidebar. Articles feed the centre and recent sidebar.
- About, contact, editorial, privacy, terms and corrections pages, managed in the admin.
- Admin authentication: scrypt password hash, database-backed hashed sessions, HttpOnly/SameSite cookie, same-origin mutations and login rate limiting.
- PostgreSQL schema in `db/001_cms.sql`. Images up to 2 MB are stored as bytea; SVG is not accepted. Media URLs are public by design.

## Local development / Vercel server deployment

1. Install dependencies with `npm ci`.
2. Create a PostgreSQL database and set `DATABASE_URL` in your local environment or in `.env.local`. Use your provider's pooled, TLS-enabled URL in production. No database is provisioned by this repository.
3. Load environment variables before the migration (Node 22+):
   `node --env-file=.env.local --import tsx scripts/migrate.ts`
   Or export DATABASE_URL and run `npm run db:migrate`.
4. Run `npm run admin:password` in an interactive terminal. Put its output in `ADMIN_PASSWORD_HASH` and set `ADMIN_EMAIL` using secure hosting environment settings. Use a unique password of at least 12 characters. Do not commit credentials.
5. Run `npm run dev`, then open `/admin/login/`. For a production build use `npm run build` and `npm start`.
6. Import the repository into Vercel using the **Next.js** preset. Add DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD_HASH. Use the default Next.js output directory; do not set `out` as the Vercel output. Run the migration against the selected database before publishing content.

The migration creates four categories, one author, default publication settings, and six draft information pages. It does not publish example match reports. Complete the pages, review details and publish your first article and news update in the admin. Back up PostgreSQL using the chosen provider before public launch.

## Static review deployment

The current ChatGPT Sites URL remains an owner-private static review. It cannot run the Node PostgreSQL API. `npm run build:review` creates a separate, temporary build with APIs excluded and database access disabled; its `out/` contains the review. The static review exposes only a locked admin sign-in page; it never exposes the editorial workspace.

The `.openai/hosting.json` static `out` configuration belongs only to that review host. The production source remains a full server-rendered Next.js application for Vercel. No PostgreSQL connection or Vercel deployment has been configured in this session.

## Validation

- `npm run build` verifies the server application.
- `npm run build:review` verifies the static review separately without changing production configuration.
- `npm run test:cms` runs the repository SQL, validation and auth tests using PGlite's in-process WASM PostgreSQL engine and a tagged-query adapter. It uses a temporary in-memory test database, never the production DATABASE_URL. This verifies the SQL repository, validation, authentication and request rejection behaviour. The production PostgreSQL driver, provider/TLS connection, authenticated HTTP writes and media upload transport still require verification against the selected service.

The API has no hard-delete endpoint. Unpublish or archive content to preserve editorial history. This initial admin supports one configured admin account; author profiles are bylines, not separate login accounts. Policies remain drafts until reviewed by the operator, and indexing remains disabled until public launch is authorised.

## Import existing website content

Run `npm run db:import` with DATABASE_URL set to import missing categories, author, site settings, five sample articles and six information pages. Articles and pages are imported as drafts for editorial review; no unverified reports or policy drafts are automatically published. The import is transactional and idempotent: existing records are preserved.

Every editorial page is protected by the server-side `(protected)` layout. Missing credentials, missing sessions, expired sessions and database failures redirect to `/admin/login/`. The API separately verifies sessions on every protected request. No setup-preview bypass is available on production or the static review. Configure ADMIN_EMAIL and ADMIN_PASSWORD_HASH in Vercel before signing in.

## Administrator authentication

Admin identity is managed by Neon Auth. A verified email must also have an active row in cms_admin_authorized before any admin page or API is available. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET as server-side Vercel variables. The initial authorised email is provisioned separately in the database. On the sign-in page use First time? Set up account, verify the email code, then sign in. Forgot password uses Neon Auth email OTP. Never commit passwords or auth secrets.
