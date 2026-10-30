ALTER TABLE cms_collected ADD COLUMN IF NOT EXISTS group_id text;
CREATE INDEX IF NOT EXISTS cms_collected_group ON cms_collected(group_id);
