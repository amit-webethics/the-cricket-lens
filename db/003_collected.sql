CREATE TABLE IF NOT EXISTS cms_collected (
 id text PRIMARY KEY,
 source_url text NOT NULL UNIQUE,
 data jsonb NOT NULL,
 state text NOT NULL DEFAULT 'new' CHECK (state IN ('new','drafted','dismissed')),
 entry_id uuid REFERENCES cms_records(id),
 entry_kind text CHECK (entry_kind IN ('articles','news')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_collected_recent ON cms_collected(created_at DESC);
