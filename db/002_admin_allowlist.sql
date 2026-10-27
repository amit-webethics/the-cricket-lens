CREATE TABLE IF NOT EXISTS cms_admin_authorized (email text PRIMARY KEY, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
