CREATE TABLE IF NOT EXISTS cms_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('articles','news','categories','authors','pages','settings')),
 title text NOT NULL,
 slug text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 data jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz,
 UNIQUE(kind,slug)
);
CREATE INDEX IF NOT EXISTS cms_records_public ON cms_records(kind,status,published_at DESC);
CREATE TABLE IF NOT EXISTS cms_sessions (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS cms_sessions_expiry ON cms_sessions(expires_at);
CREATE TABLE IF NOT EXISTS cms_login_attempts (key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, started_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS cms_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), filename text NOT NULL, mime_type text NOT NULL, bytes bytea NOT NULL CHECK(octet_length(bytes)<=2097152), alt text NOT NULL, credit text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
