import { supabase, RepCloseRate, RepRevenue, WeeklyTeam } from "./supabase";

/**
 * Fetch rolling 8 weeks of team-level data
 */
export async function getWeeklyTeamData(): Promise<WeeklyTeam[]> {
  try {
    const { data, error } = await supabase
      .from("weekly_team")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(8);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching weekly team data:", error);
    return [];
  }
}

/**
 * Fetch latest rep close rates (one row per rep, latest snapshot)
 */
export async function getRepCloseRates(): Promise<RepCloseRate[]> {
  try {
    // Get the latest snapshot_date
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from("rep_close_rate")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (snapshotError) throw snapshotError;
    if (!latestSnapshot || latestSnapshot.length === 0) return [];

    const latestDate = latestSnapshot[0].snapshot_date;

    // Fetch all reps for that snapshot
    const { data, error } = await supabase
      .from("rep_close_rate")
      .select("*")
      .eq("snapshot_date", latestDate)
      .order("rep_name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching rep close rates:", error);
    return [];
  }
}

/**
 * Fetch 4-week rolling average GA close rate for a rep
 */
export async function getRep4WeekAvgCloseRate(
  repName: string
): Promise<number> {
  try {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data, error } = await supabase
      .from("rep_close_rate")
      .select("close_rate_ga")
      .eq("rep_name", repName)
      .gte("snapshot_date", fourWeeksAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false })
      .limit(4);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const avg =
      data.reduce((sum, row) => sum + (row.close_rate_ga || 0), 0) /
      data.length;
    return Number(avg.toFixed(2));
  } catch (error) {
    console.error("Error fetching 4-week average:", error);
    return 0;
  }
}

/**
 * Fetch latest rep revenue data
 */
export async function getRepRevenue(): Promise<RepRevenue[]> {
  try {
    // Get the latest snapshot_date
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from("rep_revenue")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (snapshotError) throw snapshotError;
    if (!latestSnapshot || latestSnapshot.length === 0) return [];

    const latestDate = latestSnapshot[0].snapshot_date;

    // Fetch all reps for that snapshot
    const { data, error } = await supabase
      .from("rep_revenue")
      .select("*")
      .eq("snapshot_date", latestDate)
      .order("rep_name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching rep revenue:", error);
    return [];
  }
}

/**
 * Fetch config value (e.g., monthly_goal)
 */
export async function getConfig(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("config")
      .select("value")
      .eq("key", key)
      .single();

    if (error) throw error;
    return data?.value || null;
  } catch (error) {
    console.error(`Error fetching config key '${key}':`, error);
    return null;
  }
}

/**
 * Get last updated timestamp from weekly_team
 */
export async function getLastUpdated(): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from("weekly_team")
      .select("last_updated")
      .order("last_updated", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return new Date(data[0].last_updated);
  } catch (error) {
    console.error("Error fetching last updated:", error);
    return null;
  }
}
