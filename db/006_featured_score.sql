CREATE TABLE IF NOT EXISTS featured_score_cache (
 match_id integer PRIMARY KEY,
 attempts timestamptz[] NOT NULL DEFAULT '{}',
 snapshot jsonb
);
INSERT INTO featured_score_cache (match_id) VALUES (147964) ON CONFLICT DO NOTHING;
