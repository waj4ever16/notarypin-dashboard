# Rep Performance Coaching Dashboard — Phase 1 Verification Checklist

**Acceptance Criterion:** Dashboard numbers must match April manual validation (18.7% team GA close rate = 133 won / 711 resolved) ±1% variance.

---

## Phase 1a: GitHub Repo + Supabase Schema

### GitHub Repo Structure
- [ ] Repo created: `notarypin-dashboard`
- [ ] Folder structure follows Vibe Coding framework
- [ ] `README.md` includes setup instructions
- [ ] `.gitignore` configured for Node, Python, .env files
- [ ] All team can clone and run locally

### Supabase Schema
- [ ] Project created in Supabase
- [ ] Three tables created: `rep_close_rate`, `rep_revenue`, `weekly_team`
- [ ] All columns match brief spec exactly (types, constraints, primary keys)
- [ ] Foreign key relationships defined (if any)
- [ ] Run migration script locally — no errors
- [ ] Tables are queryable (test SELECT * on each, returns empty set)

---

## Phase 1b: Bob's Data Pull Script

### Script Execution
- [ ] `bob_data_pull.py` created and tested locally
- [ ] Script authenticates to GHL API (no 401 errors)
- [ ] Script reads transaction log (Excel/CSV from Will's Downloads)
- [ ] Script connects to Supabase (no connection errors)
- [ ] Script runs without exceptions (test run completes)

### Data Loading — `rep_close_rate` Table
- [ ] Script pulls GHL pipeline data for April + May
- [ ] Bucketing by rep UUID correct (map matches brief)
- [ ] GA-only counts correct:
  - [ ] `won_ga` counts only won leads where source contains 'apostille'
  - [ ] `lost_ga` counts only lost leads where source contains 'apostille'
  - [ ] `abandoned_ga` counts only abandoned leads where source contains 'apostille'
  - [ ] `resolved_ga` = won_ga + lost_ga + abandoned_ga
  - [ ] `close_rate_ga` = won_ga / resolved_ga (correct formula)
- [ ] Total counts correct (no source filter):
  - [ ] `won_total`, `lost_total`, `abandoned_total` include all sources
  - [ ] `resolved_total` = won_total + lost_total + abandoned_total
  - [ ] `close_rate_total` = won_total / resolved_total
- [ ] `open_ga` captured for reference (not included in close rate)

### Data Loading — `rep_revenue` Table
- [ ] Script pulls transaction log, apostille orders only
- [ ] Rep name mapping applied (Denzell Joi → Dennise Solinap, etc.)
- [ ] `mtd_revenue` = sum of Commissionable Revenue for month
- [ ] `mtd_invoice_count` = count of invoices for rep that month
- [ ] `mtd_aov` = mtd_revenue / mtd_invoice_count
- [ ] `revenue_per_ga_lead` = mtd_revenue / resolved_ga (from rep_close_rate)
- [ ] `mtd_pace_pct` = mtd_revenue / daily_pace_target (correct calculation)

### Data Loading — `weekly_team` Table
- [ ] Script aggregates to team level (sum all reps)
- [ ] `week_start` = Monday of each week (ISO week)
- [ ] `new_leads` and `total_leads` populated (placeholder for Hyros data)
- [ ] `revenue` = sum of apostille revenue for week
- [ ] `customers` = count of invoices for week
- [ ] `close_rate_ga` = team_won_ga / team_resolved_ga
- [ ] `close_rate_total` = team_won_total / team_resolved_total
- [ ] `aov` = revenue / customers
- [ ] `last_updated` = timestamp of pull

---

## Phase 1c: Frontend Build + Deployment

### Vercel Deployment
- [ ] Frontend code pushed to GitHub
- [ ] Vercel auto-deploys on push (no manual steps)
- [ ] Dashboard loads at https://notarypin-dashboard.vercel.app (or your URL)
- [ ] Vercel env vars set (Supabase URL, anon key)
- [ ] No 500 errors on page load

### View 1 — Team Daily Standup Table
- [ ] Table renders (not blank, not error)
- [ ] One row per week (rolling 8 weeks: Mon–Sun)
- [ ] Columns present: Week label, Revenue, Total CR%, GA CR%, New Leads, Customers, AOV, WoW Change
- [ ] Column data populated (numbers appear, not null/undefined)
- [ ] WoW Change calculated correctly (green if up, red if down)
- [ ] Last row is most recent week

### View 2 — Rep Close Rate Table
- [ ] Table renders (6 reps: Alan, Adriana, Julian, Dennise, Bryan, Nilton)
- [ ] One row per rep
- [ ] Columns: Rep name, Total CR%, GA CR%, Won/Resolved counts, 4-week avg GA, Trend arrow
- [ ] GA CR% matches transaction log data ±1% (spot-check 2 reps manually)
- [ ] Trend arrow logic works (up/flat/down vs 4-week avg)
- [ ] Updates when data refreshes (test by running script twice)

### View 3 — Revenue by Rep
- [ ] Table renders (one row per rep)
- [ ] Columns: Rep name, MTD Revenue, Daily Pace Target, AOV, Pace %, Revenue per GA Lead
- [ ] MTD Revenue matches transaction log ±$100 (small variance acceptable)
- [ ] Daily Pace Target calculated (monthly goal ÷ business days × days elapsed)
- [ ] Pace % shows ahead/behind correctly

---

## Phase 1d: Validation — Numbers Match April Baseline

### Validation Dataset
- [ ] Download April data from GHL (full month, all leads)
- [ ] Filter: source contains 'apostille' only
- [ ] Manual calculation:
  - Won: 133
  - Lost: ?
  - Abandoned: ?
  - Resolved: 711 (given)
  - Team GA Close Rate: 133 / 711 = 18.7%

### Dashboard Validation
- [ ] View 2 (Rep Close Rate) shows team blended GA CR in **weekly_team table**
- [ ] For April (or rolling 4-week containing April), GA CR% = 18.7% ±1% (acceptable range: 18.5% – 19.0%)
- [ ] If variance > 1%, debug:
  - [ ] Check GHL source filter (is it catching all 'apostille' variants?)
  - [ ] Check transaction log mapping (all reps matched?)
  - [ ] Check date bucketing (created_date vs closed_date?)
  - [ ] Check for duplicate leads (resolved twice?)

### Rep-Level Revenue Validation
- [ ] Pick one rep (e.g., Dennise)
- [ ] Manually sum transaction log for that rep, April apostille orders only
- [ ] Dashboard View 3 shows same amount ±$50 (allows for rounding)
- [ ] If mismatch > $50, debug:
  - [ ] Check rep name mapping (is her name spelled correctly in both sources?)
  - [ ] Check order type filter (is order_type = 'apostille' applied?)
  - [ ] Check date range (April = April 1–30?)

---

## Phase 1e: Edge Cases & Error Handling

### Missing Data
- [ ] If GHL API fails: Dashboard shows last successful snapshot + "Last updated: [timestamp]" warning
- [ ] If transaction log is missing a day: Dashboard doesn't crash, shows partial data

### Boundary Cases
- [ ] New leads created but not resolved (status = 'open'): Not included in close rate ✓
- [ ] Rep with zero leads: Displays 0% (not error) ✓
- [ ] Rep with zero revenue: Displays $0 (not error) ✓
- [ ] Week with no revenue: Displays 0, shows pace % as 0% ✓

### Timezone Handling
- [ ] Colombia timezone (UTC-5) applied correctly to "today"
- [ ] Cron jobs run at 7:45am and 2:30pm Colombia time (verify in Bob's logs)

---

## Phase 1f: Go-Live Sign-Off

- [ ] Jonathan reviews dashboard, confirms it matches his weekly coaching needs
- [ ] All validation checks pass (none marked as ⚠️ or ❌)
- [ ] All three views display correct data
- [ ] Cron jobs running on schedule (Bob logs show pulls at 7:45am, 2:30pm)
- [ ] First week of production data collected and validated
- [ ] Team can access dashboard (share Vercel link, confirm readable)

---

## If Validation Fails

**Stop and debug before shipping.**

| Issue | Debug Steps |
|-------|-------------|
| Numbers off by >1% | Re-check GHL source filter, date bucketing, rep mapping |
| Table not rendering | Check browser console for errors, Supabase query logs |
| No data in tables | Run bob_data_pull.py manually, check for errors |
| Cron jobs not firing | SSH to bob-vps, check crontab, run script manually |
| Wrong reps showing | Verify rep_uuid_map.json matches GHL UUIDs exactly |

---

**Go Live Only When:** All checkboxes ✓, Jonathan sign-off ✓, no unresolved debug items.
