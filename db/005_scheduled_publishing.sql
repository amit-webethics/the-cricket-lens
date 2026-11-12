ALTER TABLE cms_records DROP CONSTRAINT IF EXISTS cms_records_status_check;
ALTER TABLE cms_records ADD CONSTRAINT cms_records_status_check CHECK (status IN ('draft','scheduled','published','archived'));
CREATE INDEX IF NOT EXISTS cms_records_scheduled ON cms_records ((data->>'scheduledAt')) WHERE status='scheduled' AND kind IN ('articles','news');
