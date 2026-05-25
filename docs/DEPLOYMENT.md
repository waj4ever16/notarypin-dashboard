# Deployment Guide — Rep Performance Coaching Dashboard

Step-by-step guide to deploy Phase 1 dashboard to production.

---

## Prerequisites

- GitHub account with write access to notarypin organization
- Supabase project created (free tier OK)
- Vercel account (free tier OK)
- Notary Pin GHL API key (from Jonathan/RevOps)
- Transaction log Excel file (from Will/QuickBooks)

---

## Phase 1: GitHub Setup

### 1a. Create GitHub Repository

```bash
# From your local machine
mkdir -p ~/projects/notarypin-dashboard
cd ~/projects/notarypin-dashboard

# Initialize git
git init
git remote add origin https://github.com/notarypin/notarypin-dashboard.git

# Copy frontend code
cp -r /Users/williamreese/notarypin-dashboard/frontend/ ./
cp -r /Users/williamreese/notarypin-dashboard/backend/ ./
cp -r /Users/williamreese/notarypin-dashboard/docs/ ./
cp /Users/williamreese/notarypin-dashboard/README.md ./

# Create initial commit
git add .
git commit -m "Initial commit: Phase 1 dashboard scaffolding"
git push -u origin main
```

### 1b. Verify GitHub

Check that the repo exists at: https://github.com/notarypin/notarypin-dashboard

---

## Phase 2: Supabase Setup

### 2a. Create Supabase Project

1. Go to https://supabase.com
2. Click "New project"
3. Name it: `notarypin-dashboard`
4. Select region closest to you
5. Create a strong database password
6. Wait for project initialization (2-3 min)

### 2b. Run Schema Migration

1. Go to Supabase dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New query"
4. Copy contents of `backend/migrations/001_init_schema.sql`
5. Paste into the query editor
6. Click "Run"
7. Verify tables are created:
   - `rep_close_rate`
   - `rep_revenue`
   - `weekly_team`
   - `config`

### 2c. Get Supabase Credentials

1. Click "Project Settings" (gear icon)
2. Click "API"
3. Copy and save:
   - **Project URL** — this is `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Public Key** — this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Secret Key** — this is for Bob (VPS), not frontend

---

## Phase 3: Vercel Frontend Deployment

### 3a. Deploy to Vercel

1. Go to https://vercel.com
2. Click "New project"
3. Import from GitHub: select `notarypin/notarypin-dashboard`
4. Configure build settings:
   - **Framework preset:** Next.js
   - **Build command:** `npm run build`
   - **Output directory:** `.next`
5. Click "Environment variables"
6. Add two variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your Supabase Anon Key)
7. Click "Deploy"

### 3b. Verify Frontend

Wait ~3 min for build to complete. Then:
1. Click the deployment link (e.g., https://notarypin-dashboard.vercel.app)
2. You should see the dashboard with three empty tables (no data yet)
3. Check browser console (F12) for any errors

---

## Phase 4: Bob's VPS Setup (Alice handles this)

Hand off to Alice with:
- `backend/BOB_SETUP.md` instructions
- `backend/scripts/bob_data_pull.py` script
- Supabase **Service Role Key** (for write access)
- GHL API key
- GHL Location ID
- Path to transaction log Excel file

Alice will:
1. Install Python packages
2. Set environment variables on VPS
3. Test data pull script manually
4. Set up cron jobs (7:45am, 2:30pm)

---

## Phase 5: First Data Load & Validation

### 5a. Trigger First Data Pull

After Alice sets up Bob's cron:

```bash
# SSH to bob-vps
ssh bob-vps

# Run script manually to test
cd /root/.openclaw/workspace
python3 bob_data_pull.py

# Check logs
tail -50 /root/.openclaw/workspace/logs/bob_data_pull.log
```

Expected output: "=== Bob Data Pull Completed Successfully ==="

### 5b. Verify Data in Supabase

1. Go to Supabase dashboard
2. Click "Table Editor"
3. Select `rep_close_rate` table
4. Should see 6 rows (one per rep) with data

### 5c. Validate Dashboard Numbers

1. Go to dashboard: https://notarypin-dashboard.vercel.app
2. View 2 (Rep Close Rate) should show:
   - All 6 reps listed
   - GA CR % and Total CR % populated
   - Trend arrows calculated

3. Check against April baseline:
   - **Team GA Close Rate should be 18.5% – 19.0%** (±1% variance acceptable)
   - If outside this range, debug Bob's script

### 5d. Check All Three Views

- **View 1 (Team Weekly):** Should show rolling 8 weeks, revenue, close rates
- **View 2 (Rep Close Rate):** Should show 6 reps with GA & total rates, trends
- **View 3 (Revenue by Rep):** Should show MTD revenue, pace %, AOV

---

## Phase 6: Go Live Sign-Off

Only proceed after ALL checks pass:

1. ✅ GitHub repo is public and has all code
2. ✅ Supabase project created with schema
3. ✅ Vercel deployment live (no 500 errors)
4. ✅ Bob's cron jobs running (7:45am, 2:30pm)
5. ✅ Dashboard shows data (first data pull succeeded)
6. ✅ Team GA close rate = 18.5% – 19.0% (validated against April)
7. ✅ Jonathan confirms dashboard is the coaching view he needs

---

## Ongoing Maintenance

### Daily

Check logs daily (optional):
```bash
ssh bob-vps
tail -20 /root/.openclaw/workspace/logs/bob_data_pull.log
```

### Weekly

- Monitor dashboard for data freshness ("Last updated" timestamp)
- Verify both cron jobs ran (7:45am, 2:30pm)
- Check if any reps are struggling (red trends in View 2)

### Monthly

- Update transaction log when new month data is available
- Review data quality and close rate calculations
- Plan Phase 2 features (AOV, lead volume trends)

---

## Troubleshooting

### Dashboard is blank / shows "Last updated: X ago"

**Symptom:** All three views are empty, showing stale data.

**Debug:**
```bash
ssh bob-vps
tail -100 /root/.openclaw/workspace/logs/bob_data_pull.log
```

Look for errors:
- "Connection to Supabase failed" → check `SUPABASE_KEY` env var
- "Failed to fetch GHL data" → check `GHL_API_KEY` and `GHL_LOCATION_ID`
- "Transaction log file not found" → check `/root/.openclaw/workspace/transaction_log.xlsx`

### Numbers don't match April baseline (>±1% variance)

**Debug Bob's script:**
- Check GHL source filter: `source.lower().contains('apostille')`
- Verify rep UUID map (6 reps should be recognized)
- Check date bucketing: leads by `created_date`, revenue by `Date Order Created`

**Fix:** Update `bob_data_pull.py`, push to GitHub, wait for cron to re-run (7:45am or 2:30pm).

### Cron jobs not running

```bash
ssh bob-vps
crontab -l  # List cron jobs
```

Should show both entries. If missing, Alice needs to re-run Step 4 of BOB_SETUP.md.

---

## Support

Questions?
- **Frontend/Dashboard:** Reach out to Tom (this Claude Code session)
- **Data pulls/VPS:** Reach out to Alice (terminal session)
- **Business requirements:** Reach out to William

---

**Created:** May 25, 2026  
**Last Updated:** May 25, 2026
