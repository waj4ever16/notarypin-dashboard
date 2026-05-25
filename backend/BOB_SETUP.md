# Bob's Data Pull Setup — For Alice

Instructions for Alice to configure Bob's VPS for automated data pulls.

## Overview

Bob runs two scheduled data pulls daily:
- **7:45am Colombia time:** Morning pull (catches overnight deals)
- **2:30pm Colombia time:** Afternoon pull (catches same-day closes)

Each pull executes `bob_data_pull.py`, which:
1. Fetches GHL pipeline data (all opportunities)
2. Reads transaction log (Excel/CSV)
3. Calculates close rates and revenue metrics
4. Writes to Supabase tables

---

## Prerequisites (on bob-vps)

1. **Python 3.9+** (usually already installed)
2. **Required Python packages:**
   ```bash
   pip install supabase ghl-python pandas python-dateutil requests
   ```

3. **Environment variables set in Bob's shell:**
   ```bash
   export GHL_API_KEY="your-ghl-api-key"
   export GHL_LOCATION_ID="your-location-id"
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_KEY="your-service-role-key"  # NOT anon key
   export TRANSACTION_LOG_PATH="/root/.openclaw/workspace/transaction_log.xlsx"
   ```

   **Note:** Store these in `/root/.bashrc` or a dedicated `.env` file that Bob sources.

4. **Transaction log file** in Excel format at `/root/.openclaw/workspace/transaction_log.xlsx`
   - Sheet name: `Orders`
   - Columns required:
     - `Date Order Created` (datetime)
     - `Account/Sales Owner` (rep name)
     - `Commissionable Revenue` (numeric)
     - `Order Type` (text: "apostille", "mobile notary", etc.)

---

## Step 1: Prepare the VPS

SSH to bob-vps:
```bash
ssh bob-vps
```

Copy the data pull script to Bob's workspace:
```bash
# Clone or copy the repo to the VPS
# Assuming you have git access:
cd /root/.openclaw/workspace
git clone https://github.com/notarypin/notarypin-dashboard.git
cd notarypin-dashboard

# Or manually copy:
# scp backend/scripts/bob_data_pull.py bob-vps:/root/.openclaw/workspace/
```

Make the script executable:
```bash
chmod +x /root/.openclaw/workspace/bob_data_pull.py
```

---

## Step 2: Set Environment Variables

Edit `/root/.bashrc` or create `/root/.openclaw/workspace/.env`:

```bash
# /root/.bashrc (add these lines)
export GHL_API_KEY="pit-xxxxxxxxxxxxx"
export GHL_LOCATION_ID="FcNqPb48SjQDIuh2BBkv"
export SUPABASE_URL="https://knwtzxgfbqmfiexogeuz.supabase.co"
export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export TRANSACTION_LOG_PATH="/root/.openclaw/workspace/transaction_log.xlsx"
```

Then source it:
```bash
source /root/.bashrc
```

**Note:** Use **service role key**, not anon key. Service role key has write access to Supabase.

---

## Step 3: Verify GHL + Supabase Connection

Test the script manually:
```bash
cd /root/.openclaw/workspace
python3 bob_data_pull.py
```

Check the log:
```bash
tail -50 /root/.openclaw/workspace/logs/bob_data_pull.log
```

Expected output:
```
2026-05-25 07:45:00,123 [INFO] === Bob Data Pull Started ===
2026-05-25 07:45:01,456 [INFO] Connected to Supabase
2026-05-25 07:45:02,789 [INFO] Fetched 500 leads from GHL
2026-05-25 07:45:03,012 [INFO] Processed GHL data: 6 reps
2026-05-25 07:45:03,456 [INFO] Loaded transaction log: 1200 rows
2026-05-25 07:45:03,789 [INFO] Apostille orders: 300 rows
2026-05-25 07:45:04,012 [INFO] Wrote 6 rows to rep_close_rate
2026-05-25 07:45:04,234 [INFO] Wrote 6 rows to rep_revenue
2026-05-25 07:45:04,456 [INFO] Wrote 1 rows to weekly_team
2026-05-25 07:45:04,678 [INFO] === Bob Data Pull Completed Successfully ===
```

If successful, data has been written to Supabase. Verify in the dashboard:
- Check Supabase UI: `rep_close_rate`, `rep_revenue`, `weekly_team` tables have data
- Check dashboard frontend: http://notarypin-dashboard.vercel.app (after frontend is deployed)

---

## Step 4: Set Up Cron Jobs

Edit Bob's crontab:
```bash
crontab -e
```

Add these two lines:

```
# Notary Pin dashboard — daily data pulls (Colombia time = UTC-5)
# 7:45am Colombia time = 12:45pm UTC
45 7 * * * cd /root/.openclaw/workspace && source /root/.bashrc && python3 bob_data_pull.py >> /root/.openclaw/workspace/logs/bob_data_pull_cron.log 2>&1

# 2:30pm Colombia time = 19:30 UTC
30 14 * * * cd /root/.openclaw/workspace && source /root/.bashrc && python3 bob_data_pull.py >> /root/.openclaw/workspace/logs/bob_data_pull_cron.log 2>&1
```

**Note:** Times are in **local Colombia time** (UTC-5). Cron uses local timezone.

Verify crontab is set:
```bash
crontab -l
```

Should show both entries.

---

## Step 5: Monitor Cron Runs

Check if cron jobs are firing:
```bash
# View cron job log
tail -50 /root/.openclaw/workspace/logs/bob_data_pull_cron.log

# Or check VPS system logs
grep CRON /var/log/syslog | tail -20
```

Expected behavior:
- **7:45am:** Script runs, pulls GHL + transaction log, writes to Supabase
- **2:30pm:** Script runs again, updates Supabase with latest data
- **Error handling:** If GHL API fails, last successful snapshot is retained, dashboard shows "Last updated: X ago"

---

## Troubleshooting

### Cron job not running

Check if cron is enabled:
```bash
service cron status
```

If stopped, restart it:
```bash
sudo service cron start
```

### "ModuleNotFoundError: No module named 'supabase'"

Install missing packages:
```bash
pip install supabase ghl-python pandas python-dateutil requests
```

### "Connection to Supabase failed"

Verify environment variables are set:
```bash
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

If empty, they weren't sourced. Add to `/root/.bashrc` or directly in the cron command:
```bash
45 7 * * * GHL_API_KEY="..." SUPABASE_URL="..." ... python3 bob_data_pull.py
```

### "Transaction log file not found"

Check file exists:
```bash
ls -la /root/.openclaw/workspace/transaction_log.xlsx
```

If missing, upload it:
```bash
# From your local machine:
scp ~/Downloads/transaction_log.xlsx bob-vps:/root/.openclaw/workspace/
```

### GHL data not updating

Check GHL API key and location ID:
```bash
curl -H "Authorization: Bearer $GHL_API_KEY" \
  "https://rest.gohighlevel.com/v1/opportunities?locationId=$GHL_LOCATION_ID&limit=1"
```

Should return JSON with opportunity data.

---

## Monitoring & Maintenance

### Daily check
```bash
tail -20 /root/.openclaw/workspace/logs/bob_data_pull.log
```

### Verify Supabase data
```bash
# Via psql (if you have access to Supabase via VPS):
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM rep_close_rate"
```

### Update transaction log
When Will uploads a new transaction log:
```bash
scp ~/Downloads/transaction_log.xlsx bob-vps:/root/.openclaw/workspace/
```

Cron jobs will automatically use the latest file on next run (7:45am or 2:30pm).

---

## Notes for Alice

- **Timezone:** All times above are Colombia time (UTC-5). If VPS is in a different timezone, adjust accordingly.
- **Service Role Key:** Bob needs the **service role key** (not anon key) to write to Supabase.
- **Logs:** All output goes to `/root/.openclaw/workspace/logs/bob_data_pull.log` and `bob_data_pull_cron.log`.
- **Testing:** Always test with `python3 bob_data_pull.py` manually before relying on cron.
- **First Run:** After setup, wait until the next scheduled cron time (7:45am or 2:30pm) to verify it works. Or trigger manually for testing.

---

**Created:** May 25, 2026  
**Last Updated:** May 25, 2026
