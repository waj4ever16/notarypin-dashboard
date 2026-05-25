-- Notary Pin Dashboard — Phase 1 Schema
-- Initialize tables for rep performance coaching dashboard

-- Config table: store monthly goal and other settings
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default monthly goal ($250K)
INSERT INTO config (key, value) VALUES ('monthly_goal', '250000')
ON CONFLICT (key) DO NOTHING;

-- Rep Close Rate table: primary coaching table with GHL pipeline data
CREATE TABLE IF NOT EXISTS rep_close_rate (
  snapshot_date DATE NOT NULL,
  rep_name TEXT NOT NULL,
  ghl_uuid TEXT NOT NULL,
  won_ga INTEGER NOT NULL DEFAULT 0,
  lost_ga INTEGER NOT NULL DEFAULT 0,
  abandoned_ga INTEGER NOT NULL DEFAULT 0,
  resolved_ga INTEGER NOT NULL DEFAULT 0,
  close_rate_ga NUMERIC(5,2),
  won_total INTEGER NOT NULL DEFAULT 0,
  lost_total INTEGER NOT NULL DEFAULT 0,
  abandoned_total INTEGER NOT NULL DEFAULT 0,
  resolved_total INTEGER NOT NULL DEFAULT 0,
  close_rate_total NUMERIC(5,2),
  open_ga INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_date, rep_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS rep_close_rate_rep_idx ON rep_close_rate(rep_name);
CREATE INDEX IF NOT EXISTS rep_close_rate_date_idx ON rep_close_rate(snapshot_date);

-- Rep Revenue table: transaction log data aggregated by rep
CREATE TABLE IF NOT EXISTS rep_revenue (
  snapshot_date DATE NOT NULL,
  rep_name TEXT NOT NULL,
  mtd_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  mtd_invoice_count INTEGER NOT NULL DEFAULT 0,
  revenue_per_ga_lead NUMERIC(10,2),
  mtd_aov NUMERIC(10,2),
  mtd_pace_pct NUMERIC(5,2),
  PRIMARY KEY (snapshot_date, rep_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS rep_revenue_rep_idx ON rep_revenue(rep_name);
CREATE INDEX IF NOT EXISTS rep_revenue_date_idx ON rep_revenue(snapshot_date);

-- Weekly Team table: aggregated team-level metrics by week
CREATE TABLE IF NOT EXISTS weekly_team (
  week_start DATE PRIMARY KEY,
  new_leads INTEGER NOT NULL DEFAULT 0,
  total_leads INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  customers INTEGER NOT NULL DEFAULT 0,
  close_rate_ga NUMERIC(5,2),
  close_rate_total NUMERIC(5,2),
  won_ga INTEGER NOT NULL DEFAULT 0,
  resolved_ga INTEGER NOT NULL DEFAULT 0,
  won_total INTEGER NOT NULL DEFAULT 0,
  resolved_total INTEGER NOT NULL DEFAULT 0,
  aov NUMERIC(10,2),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS weekly_team_date_idx ON weekly_team(week_start);

-- Optional: Add RLS (Row Level Security) if needed for multi-user access
-- ALTER TABLE rep_close_rate ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rep_revenue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_team ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon user (Vercel frontend)
GRANT SELECT ON rep_close_rate TO anon;
GRANT SELECT ON rep_revenue TO anon;
GRANT SELECT ON weekly_team TO anon;
GRANT SELECT ON config TO anon;

-- Grant full permissions to authenticated user (Bob's data pulls)
GRANT SELECT, INSERT, UPDATE, DELETE ON rep_close_rate TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rep_revenue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_team TO authenticated;
GRANT SELECT, UPDATE ON config TO authenticated;
