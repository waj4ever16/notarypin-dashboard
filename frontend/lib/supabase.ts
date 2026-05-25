import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type RepCloseRate = {
  snapshot_date: string;
  rep_name: string;
  ghl_uuid: string;
  won_ga: number;
  lost_ga: number;
  abandoned_ga: number;
  resolved_ga: number;
  close_rate_ga: number;
  won_total: number;
  lost_total: number;
  abandoned_total: number;
  resolved_total: number;
  close_rate_total: number;
  open_ga: number;
};

export type RepRevenue = {
  snapshot_date: string;
  rep_name: string;
  mtd_revenue: number;
  mtd_invoice_count: number;
  revenue_per_ga_lead: number;
  mtd_aov: number;
  mtd_pace_pct: number;
};

export type WeeklyTeam = {
  week_start: string;
  new_leads: number;
  total_leads: number;
  revenue: number;
  customers: number;
  close_rate_ga: number;
  close_rate_total: number;
  won_ga: number;
  resolved_ga: number;
  won_total: number;
  resolved_total: number;
  aov: number;
  last_updated: string;
};
