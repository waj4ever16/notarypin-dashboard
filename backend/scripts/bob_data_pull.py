#!/usr/bin/env python3
"""
Bob's Data Pull Script — Rep Performance Coaching Dashboard Phase 1

Pulls GHL pipeline + transaction log data 2x daily (7:45am, 2:30pm Colombia time).
Calculates close rates and revenue metrics, writes to Supabase.

Requirements:
  pip install supabase ghl-python pandas python-dateutil

Environment variables:
  GHL_API_KEY: GoHighLevel API key
  GHL_LOCATION_ID: Your GHL location ID
  SUPABASE_URL: Supabase project URL
  SUPABASE_KEY: Supabase service role key (not anon key — needs write access)
  TRANSACTION_LOG_PATH: Path to transaction log Excel/CSV file

Usage:
  python3 bob_data_pull.py

Logs:
  /root/.openclaw/workspace/logs/bob_data_pull.log
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple
import pandas as pd
from supabase import create_client, Client
from dateutil import parser as date_parser

# ============================================================================
# Configuration
# ============================================================================

GHL_API_KEY = os.environ.get("GHL_API_KEY")
GHL_LOCATION_ID = os.environ.get("GHL_LOCATION_ID")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TRANSACTION_LOG_PATH = os.environ.get("TRANSACTION_LOG_PATH", "/root/.openclaw/workspace/transaction_log.xlsx")

# Rep UUID map (from brief)
REP_UUID_MAP = {
    "iIFb9aWWM0y2YiFgurZp": "Alan Gallegos",
    "SOYglhYIo1a76Kji0HRE": "Adriana Garcia",
    "z78sVjzTpli9r1s9a4Ky": "Julian Lopez",
    "9F8CftGU2fYtaZ9w4CLm": "Dennise Solinap",
    "C6FCsUyjIsv4MUEdcZcT": "Bryan Mariano",
    "0dbPVoOme7pp5KLacPD2": "Nilton Durand",
}

# Transaction log rep name mapping
TRANSACTION_LOG_REP_MAP = {
    "Denzell Joi": "Dennise Solinap",
    # Add more mappings as needed
}

# ============================================================================
# Logging Setup
# ============================================================================

log_dir = Path("/root/.openclaw/workspace/logs")
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / "bob_data_pull.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ============================================================================
# GHL API Client
# ============================================================================

class GHLClient:
    """GoHighLevel API client for pipeline data."""

    def __init__(self, api_key: str, location_id: str):
        self.api_key = api_key
        self.location_id = location_id
        self.base_url = "https://rest.gohighlevel.com/v1"

    def get_pipeline_data(self, limit: int = 5000) -> List[Dict]:
        """Fetch all pipeline opportunities with pagination."""
        import requests

        all_leads = []
        skip = 0

        while True:
            try:
                url = f"{self.base_url}/opportunities"
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                params = {
                    "locationId": self.location_id,
                    "limit": min(limit, 100),
                    "skip": skip,
                }

                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()

                data = response.json()
                leads = data.get("opportunities", [])

                if not leads:
                    break

                all_leads.extend(leads)
                skip += len(leads)

                if len(leads) < min(limit, 100):
                    break

            except Exception as e:
                logger.error(f"Error fetching GHL pipeline data: {e}")
                break

        logger.info(f"Fetched {len(all_leads)} leads from GHL")
        return all_leads

# ============================================================================
# Data Processing
# ============================================================================

def process_ghl_data(leads: List[Dict]) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Process GHL pipeline data into rep_close_rate and weekly_team tables.

    Returns:
        Tuple of (rep_close_rate_df, weekly_team_df)
    """
    snapshot_date = datetime.now().date()
    rep_close_rate_rows = []
    team_stats = {
        "won_ga": 0,
        "lost_ga": 0,
        "abandoned_ga": 0,
        "won_total": 0,
        "lost_total": 0,
        "abandoned_total": 0,
    }

    # Group by rep
    rep_stats = {}

    for lead in leads:
        assigned_to = lead.get("assignedTo")
        source = (lead.get("source") or "").lower()
        status = (lead.get("status") or "").lower()
        created_date = lead.get("createdAt")

        # Skip if no assigned rep
        if not assigned_to:
            continue

        # Get rep name from UUID
        rep_name = REP_UUID_MAP.get(assigned_to)
        if not rep_name:
            logger.warning(f"Unknown rep UUID: {assigned_to}")
            continue

        # Skip 'open' status — don't count toward close rate
        if status == "open":
            if "apostille" in source:
                if rep_name not in rep_stats:
                    rep_stats[rep_name] = {
                        "won_ga": 0,
                        "lost_ga": 0,
                        "abandoned_ga": 0,
                        "won_total": 0,
                        "lost_total": 0,
                        "abandoned_total": 0,
                        "open_ga": 0,
                    }
                rep_stats[rep_name]["open_ga"] += 1
            continue

        # Initialize rep stats if not exists
        if rep_name not in rep_stats:
            rep_stats[rep_name] = {
                "won_ga": 0,
                "lost_ga": 0,
                "abandoned_ga": 0,
                "won_total": 0,
                "lost_total": 0,
                "abandoned_total": 0,
                "open_ga": 0,
            }

        # Count resolved leads
        is_ga = "apostille" in source

        if status == "won":
            rep_stats[rep_name]["won_total"] += 1
            team_stats["won_total"] += 1
            if is_ga:
                rep_stats[rep_name]["won_ga"] += 1
                team_stats["won_ga"] += 1
        elif status == "lost":
            rep_stats[rep_name]["lost_total"] += 1
            team_stats["lost_total"] += 1
            if is_ga:
                rep_stats[rep_name]["lost_ga"] += 1
                team_stats["lost_ga"] += 1
        elif status == "abandoned":
            rep_stats[rep_name]["abandoned_total"] += 1
            team_stats["abandoned_total"] += 1
            if is_ga:
                rep_stats[rep_name]["abandoned_ga"] += 1
                team_stats["abandoned_ga"] += 1

    # Build rep_close_rate table
    for rep_name, stats in rep_stats.items():
        resolved_ga = stats["won_ga"] + stats["lost_ga"] + stats["abandoned_ga"]
        resolved_total = (
            stats["won_total"] + stats["lost_total"] + stats["abandoned_total"]
        )

        close_rate_ga = (stats["won_ga"] / resolved_ga * 100) if resolved_ga > 0 else 0
        close_rate_total = (
            (stats["won_total"] / resolved_total * 100) if resolved_total > 0 else 0
        )

        rep_close_rate_rows.append({
            "snapshot_date": snapshot_date,
            "rep_name": rep_name,
            "ghl_uuid": [k for k, v in REP_UUID_MAP.items() if v == rep_name][0],
            "won_ga": stats["won_ga"],
            "lost_ga": stats["lost_ga"],
            "abandoned_ga": stats["abandoned_ga"],
            "resolved_ga": resolved_ga,
            "close_rate_ga": round(close_rate_ga, 2),
            "won_total": stats["won_total"],
            "lost_total": stats["lost_total"],
            "abandoned_total": stats["abandoned_total"],
            "resolved_total": resolved_total,
            "close_rate_total": round(close_rate_total, 2),
            "open_ga": stats["open_ga"],
        })

    # Build weekly_team table (aggregate by week)
    week_start = snapshot_date - timedelta(days=snapshot_date.weekday())  # Monday
    resolved_ga = team_stats["won_ga"] + team_stats["lost_ga"] + team_stats["abandoned_ga"]
    resolved_total = team_stats["won_total"] + team_stats["lost_total"] + team_stats["abandoned_total"]

    close_rate_ga = (
        (team_stats["won_ga"] / resolved_ga * 100) if resolved_ga > 0 else 0
    )
    close_rate_total = (
        (team_stats["won_total"] / resolved_total * 100)
        if resolved_total > 0
        else 0
    )

    weekly_team_row = {
        "week_start": week_start,
        "new_leads": 0,  # Placeholder for Hyros data
        "total_leads": 0,  # Placeholder for Hyros data
        "revenue": 0,  # Will be filled from transaction log
        "customers": 0,  # Will be filled from transaction log
        "close_rate_ga": round(close_rate_ga, 2),
        "close_rate_total": round(close_rate_total, 2),
        "won_ga": team_stats["won_ga"],
        "resolved_ga": resolved_ga,
        "won_total": team_stats["won_total"],
        "resolved_total": resolved_total,
        "aov": 0,  # Will be calculated from transaction log
        "last_updated": datetime.now(),
    }

    rep_close_rate_df = pd.DataFrame(rep_close_rate_rows)
    weekly_team_df = pd.DataFrame([weekly_team_row])

    logger.info(f"Processed GHL data: {len(rep_close_rate_df)} reps")
    return rep_close_rate_df, weekly_team_df

def process_transaction_log(
    transaction_log_path: str,
) -> Tuple[pd.DataFrame, Dict]:
    """
    Process transaction log (Excel/CSV) into rep_revenue data.

    Returns:
        Tuple of (rep_revenue_df, team_revenue_dict)
    """
    snapshot_date = datetime.now().date()

    try:
        # Read transaction log
        if transaction_log_path.endswith(".xlsx"):
            df = pd.read_excel(transaction_log_path, sheet_name="Orders")
        else:
            df = pd.read_csv(transaction_log_path)

        logger.info(f"Loaded transaction log: {len(df)} rows")
    except Exception as e:
        logger.error(f"Error reading transaction log: {e}")
        return pd.DataFrame(), {}

    # Filter: apostille order type only
    df["Order Type"] = df["Order Type"].fillna("").str.strip()
    apostille_df = df[df["Order Type"].str.lower().contains("apostille", na=False)]

    logger.info(f"Apostille orders: {len(apostille_df)} rows")

    # Calculate MTD (month-to-date) for each rep
    rep_revenue_rows = []
    team_revenue = {"mtd_revenue": 0, "mtd_invoice_count": 0}

    # Determine current month
    today = datetime.now()
    month_start = datetime(today.year, today.month, 1)

    # Filter for current month
    apostille_df["Date Order Created"] = pd.to_datetime(
        apostille_df["Date Order Created"], errors="coerce"
    )
    mtd_df = apostille_df[apostille_df["Date Order Created"] >= month_start]

    # Group by rep
    for rep_name, rep_group in mtd_df.groupby("Account/Sales Owner"):
        # Apply rep mapping if exists
        standardized_name = TRANSACTION_LOG_REP_MAP.get(rep_name, rep_name)

        mtd_revenue = rep_group["Commissionable Revenue"].sum()
        mtd_invoice_count = len(rep_group)
        mtd_aov = mtd_revenue / mtd_invoice_count if mtd_invoice_count > 0 else 0

        # revenue_per_ga_lead will be calculated after joining with GHL data
        # For now, placeholder
        revenue_per_ga_lead = 0

        # Calculate pace percentage
        # daily_pace_target = (monthly_goal / business_days_in_month) * days_elapsed
        # This will be filled when we fetch the monthly_goal from config table

        rep_revenue_rows.append({
            "snapshot_date": snapshot_date,
            "rep_name": standardized_name,
            "mtd_revenue": round(mtd_revenue, 2),
            "mtd_invoice_count": mtd_invoice_count,
            "revenue_per_ga_lead": round(revenue_per_ga_lead, 2),
            "mtd_aov": round(mtd_aov, 2),
            "mtd_pace_pct": 0,  # Will be calculated with config table
        })

        team_revenue["mtd_revenue"] += mtd_revenue
        team_revenue["mtd_invoice_count"] += mtd_invoice_count

    rep_revenue_df = pd.DataFrame(rep_revenue_rows)
    logger.info(f"Processed transaction log: {len(rep_revenue_df)} reps with revenue")
    return rep_revenue_df, team_revenue

# ============================================================================
# Supabase Write
# ============================================================================

def write_to_supabase(
    supabase: Client,
    rep_close_rate_df: pd.DataFrame,
    rep_revenue_df: pd.DataFrame,
    weekly_team_df: pd.DataFrame,
) -> bool:
    """Write data to Supabase tables."""
    try:
        snapshot_date = datetime.now().date()

        # Upsert rep_close_rate
        if not rep_close_rate_df.empty:
            for _, row in rep_close_rate_df.iterrows():
                supabase.table("rep_close_rate").upsert(
                    row.to_dict(),
                    on_conflict="snapshot_date,rep_name",
                ).execute()
            logger.info(f"Wrote {len(rep_close_rate_df)} rows to rep_close_rate")

        # Upsert rep_revenue
        if not rep_revenue_df.empty:
            for _, row in rep_revenue_df.iterrows():
                supabase.table("rep_revenue").upsert(
                    row.to_dict(),
                    on_conflict="snapshot_date,rep_name",
                ).execute()
            logger.info(f"Wrote {len(rep_revenue_df)} rows to rep_revenue")

        # Upsert weekly_team
        if not weekly_team_df.empty:
            for _, row in weekly_team_df.iterrows():
                supabase.table("weekly_team").upsert(
                    row.to_dict(),
                    on_conflict="week_start",
                ).execute()
            logger.info(f"Wrote {len(weekly_team_df)} rows to weekly_team")

        return True
    except Exception as e:
        logger.error(f"Error writing to Supabase: {e}")
        return False

# ============================================================================
# Main
# ============================================================================

def main():
    """Main entry point."""
    logger.info("=== Bob Data Pull Started ===")

    # Validate environment
    if not all([GHL_API_KEY, GHL_LOCATION_ID, SUPABASE_URL, SUPABASE_KEY]):
        logger.error("Missing required environment variables")
        sys.exit(1)

    # Initialize Supabase client
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Fetch GHL pipeline data
    ghl_client = GHLClient(GHL_API_KEY, GHL_LOCATION_ID)
    try:
        leads = ghl_client.get_pipeline_data()
    except Exception as e:
        logger.error(f"Failed to fetch GHL data: {e}")
        sys.exit(1)

    # Process GHL data
    rep_close_rate_df, weekly_team_df = process_ghl_data(leads)

    # Process transaction log
    rep_revenue_df, team_revenue = process_transaction_log(TRANSACTION_LOG_PATH)

    # Write to Supabase
    success = write_to_supabase(
        supabase, rep_close_rate_df, rep_revenue_df, weekly_team_df
    )

    if success:
        logger.info("=== Bob Data Pull Completed Successfully ===")
        sys.exit(0)
    else:
        logger.error("=== Bob Data Pull Failed ===")
        sys.exit(1)

if __name__ == "__main__":
    main()
