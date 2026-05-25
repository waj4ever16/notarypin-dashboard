# Notary Pin — Rep Performance Coaching Dashboard
## Vibe Coding Project Brief | Phase 1 | v5 (Final)

---

## Purpose

Build a daily-updating rep-level performance dashboard that answers three questions at any point during the day:

1. Which rep is struggling on Google Ad leads?
2. Are we pacing toward the monthly revenue target?
3. What's the right framing for this week's coaching conversations?

---

## Update Cadence

| Frequency | Schedule | What triggers it |
|-----------|----------|------------------|
| **Daily minimum** | Every morning before 8am | Bob pulls GHL pipeline + transaction log, writes to Supabase |
| **2x/day preferred** | + afternoon pull ~2–3pm | Catches same-day deals closed in the morning session |
| **Real-time fallback** | On-demand via API call | William or Alice can trigger a manual refresh at any time |

---

## The Three Questions This Dashboard Must Answer

| # | Question | Answer comes from |
|---|----------|------------------|
| 1 | Which rep is struggling on Google Ad leads? | GHL GA-only close rate by rep (source contains 'apostille') |
| 2 | How is each rep performing overall? | GHL total close rate by rep (all sources) |
| 3 | Are we pacing to hit the monthly target? | Transaction log revenue vs. daily pace toward monthly goal |

---

## Data Sources — Confirmed and Locked

| Source | System | What it measures | Key fields |
|--------|--------|------------------|-----------|
| **GHL Pipeline** | GoHighLevel | Close rate by rep — GA-only AND all-source | assignedTo (UUID), source, status (won/lost/abandoned/open), created_date |
| **Transaction Log** | Excel / QuickBooks | Revenue by rep, daily | Date Order Created, Account/Sales Owner, Commissionable Revenue, Order Type |

---

## Critical Data Rules

- **GA lead filter:** source field contains 'apostille' (case insensitive). Covers all phone and form Google Ad campaign assets.
- **Close rate formula:** won ÷ (won + lost + abandoned). Exclude 'open' status leads — they haven't resolved yet.
- **Two close rates per rep:** GA-only (apostille source filter applied) AND total (all sources, no filter). Both required.
- **Revenue source of truth:** Transaction log, Orders sheet, Commissionable Revenue field. Apostille order type only.
- **Rep name mapping:** 'Denzell Joi' in transaction log = Dennise Solinap.

---

## Rep UUID Map (GHL)

| Rep | GHL UUID |
|-----|----------|
| Alan Gallegos | iIFb9aWWM0y2YiFgurZp |
| Adriana Garcia | SOYglhYIo1a76Kji0HRE |
| Julian Lopez | z78sVjzTpli9r1s9a4Ky |
| Dennise Solinap | 9F8CftGU2fYtaZ9w4CLm |
| Bryan Mariano | C6FCsUyjIsv4MUEdcZcT |
| Nilton Durand | 0dbPVoOme7pp5KLacPD2 |

---

## What the Dashboard Shows — Phase 1 Scope

### View 1 — Team Daily Standup Table

One row per week (rolling 8 weeks). Updates at least once daily.

**Columns:**
- Week Mon–Sun label
- Revenue from transaction log, apostille only, cumulative for the week
- Total Close Rate from GHL: won/(won+lost+abandoned), all sources
- GA Close Rate from GHL: won/(won+lost+abandoned), apostille source only
- New Leads from GHL: new opportunities created that week, apostille source filter
- Customers from transaction log, count of invoices for the week
- AOV from transaction log: revenue ÷ customers for the week — team-level
- WoW Change auto-calculated vs prior week, green = up, red = down

### View 2 — Rep Close Rate Table

One row per rep. Two close rate columns side by side. Updates daily.

**Columns:**
- Rep name
- Total CR % all GHL sources — shows overall output
- GA CR % apostille leads only — shows Google Ad conversion performance
- Won / Resolved raw counts for current period
- 4-week avg (GA) rolling average GA close rate — trend baseline
- Trend arrow vs 4-week avg — up/flat/down

### View 3 — Revenue by Rep

From transaction log. Updates daily.

**Shows:**
- MTD revenue per rep
- Daily pace target (monthly goal ÷ business days in month) × days elapsed
- AOV MTD revenue ÷ MTD invoice count — key signal for January comparison
- Pace % MTD actual ÷ MTD target — are they ahead or behind?
- Revenue per GA lead MTD revenue ÷ resolved GA leads — efficiency metric

---

## Technical Clarifications — Phase 1

### 1. Snapshot Timing & Data Bucketing

- **Leads are bucketed by `created_date`** — not closed_date. This captures when the opportunity was created in GHL.
- **Revenue is bucketed by `Date Order Created`** — not invoice date.
- **Weeks run Monday–Sunday** (ISO week).
- **Snapshot happens at each pull time** (7:45am and 2:30pm Colombia time), not at end of week. Each pull creates a new row in the tables with `snapshot_date = today`.
- This means a rep can have multiple rows per day (before 8am pull and after 2-3pm pull), showing the progression of deals throughout the day.

### 2. Monthly Revenue Target as Config Value

- **Store monthly goal in Supabase as a `config` table**, not hardcoded in code.
- Table schema: `config(key TEXT, value TEXT)`. Example: `('monthly_goal', '250000')`.
- This allows William to adjust the monthly target ($250K, $200K, etc.) without redeploying code.
- The `daily_pace_target` calculation in `rep_revenue` uses this value: `(monthly_goal ÷ business_days_in_month) × days_elapsed_so_far`.

### 3. Error Handling & Stale Data

- **If GHL API fails:** Bob logs the error in his VPS logs and retains the last successful snapshot.
- **Dashboard behavior:** Shows the last successful data with a **"Last updated: [timestamp]"** indicator in the UI.
- **No hard error:** Dashboard never goes blank. Users know data is stale but the dashboard remains readable.
- **Example:** If the 2:30pm pull fails, the dashboard still shows the 7:45am snapshot with "Last updated: May 25, 7:45 AM".

### 4. Validation Success Criteria

- **Acceptable variance:** ±1% on close rate metrics (not exact match).
- **Baseline:** April manual validation shows 18.7% team GA close rate (133 won / 711 resolved).
- **Dashboard validation:** When Phase 1 is built, View 1 (weekly team table) for the week containing April must show GA Close Rate between **18.5% – 19.0%**.
- **Variance rationale:** Timezone differences in timestamps and rounding can cause small divergences; ±1% is realistic.

### 5. Rolling Window Definition

- **8 full Mon–Sun calendar weeks** (not days, not partial weeks).
- **New row added each Monday morning pull** — when Bob's 7:45am cron runs on Monday, it appends a new `weekly_team` row for the week starting that Monday.
- **Example:** If today is May 27 (Tuesday), the table shows 8 rows: May 19–25, May 12–18, May 5–11, ... back 8 weeks.
- **Weekly aggregation:** All 6 reps' data for that week sums into one team-level `weekly_team` row. Individual rep data lives in `rep_close_rate` and `rep_revenue` (one row per snapshot per rep).

---

## Out of Scope — Phase 1

| What | Why / When |
|------|-----------|
| Behavioral scorecard (script compliance, payment on call) | Requires call transcript pipeline — Phase 3 |
| Rep-level AOV tracking | Phase 2 — transaction log has it, easy add-on |
| Hyros ROAS / ad spend data | Jonathan owns this view — not a coaching metric |
| Mobile notary data | Separate pipeline, separate coaching context |
| Real-time streaming (sub-hourly) | 2x daily is sufficient — real-time adds complexity without coaching value |

---

## Tech Stack

| Layer | Tool | Role |
|-------|------|------|
| **Storage** | GitHub | All code lives here. Version controlled. Tom writes directly to repo. |
| **Database** | Supabase | Stores daily snapshots of GHL, transaction log, and Hyros data. Powers dashboard in real time. |
| **Backend** | Bob (FastAPI / VPS) | Runs scheduled pulls 2x/day from GHL API, processes transaction log, writes to Supabase. |
| **Frontend** | Vercel | Dashboard UI. Reads from Supabase. Auto-deploys on GitHub push. |
| **Scheduler** | Cron on Bob's VPS | Triggers Bob's pull jobs at 7:45am and 2:30pm daily (Colombia time). |

---

## Build Phases

| Ph | Name | What gets built | When |
|----|------|-----------------|------|
| **1** | **Core dashboard** | Team standup table + rep close rate (GA + total) + rep revenue. Bob's 2x daily cron. Supabase schema + Vercel frontend. | **Now ◀** |
| 2 | AOV + deeper rep metrics | Add AOV by rep, translation upsell capture rate, lead volume trends by source. | After Ph 1 stable |
| 3 | Behavioral scorecard | Call transcript scoring via AssemblyAI — script compliance, payment capture, single-option quoting. | After Ph 2 |

---

## Phase 1 — Next Steps in Order

1. **Set up GitHub repo:** `notarypin-dashboard`. One folder per project per the Vibe Coding framework.
2. **Set up Supabase project:** Create three tables using the schema below — `weekly_team`, `rep_close_rate`, `rep_revenue`. Store `config` table for monthly goal.
3. **Configure Bob's cron:** Two daily jobs — 7:45am and 2:30pm Colombia time. Each job pulls GHL pipeline + transaction log, writes to Supabase.
4. **First data load:** Alice pulls GHL April + May data with `created_date` included (needed for weekly bucketing). No Hyros data needed. One-time import script writes historical data to Supabase.
5. **Build frontend:** Tom builds Next.js dashboard on Vercel. Reads from Supabase. Three views per spec above.
6. **Validate:** Compare dashboard numbers against our manually calculated April close rates (133 won / 711 resolved = 18.7% team GA rate). Numbers must match (±1%) before going live.

---

## Supabase Table Schema — Phase 1

### `rep_close_rate` (primary coaching table)

| Column | Type | Notes |
|--------|------|-------|
| snapshot_date | date | Date of the pull (primary key with rep_name) |
| rep_name | text | Alan / Adriana / Julian / Dennise / Bryan / Nilton |
| ghl_uuid | text | Rep's GHL assignedTo UUID |
| won_ga | integer | Won on GA leads (source contains 'apostille') |
| lost_ga | integer | Lost on GA leads |
| abandoned_ga | integer | Abandoned on GA leads |
| resolved_ga | integer | won_ga + lost_ga + abandoned_ga |
| close_rate_ga | numeric | won_ga / resolved_ga — Google Ad performance |
| won_total | integer | Won on all sources (no source filter) |
| lost_total | integer | Lost on all sources |
| abandoned_total | integer | Abandoned on all sources |
| resolved_total | integer | Total resolved all sources |
| close_rate_total | numeric | won_total / resolved_total — overall output |
| open_ga | integer | Open GA leads at time of pull — for reference only, not used in rate |

### `rep_revenue`

| Column | Type | Notes |
|--------|------|-------|
| snapshot_date | date | Date of the pull |
| rep_name | text | Standardized name |
| mtd_revenue | numeric | Transaction log, apostille only, month-to-date |
| mtd_invoice_count | integer | Number of invoices paid MTD |
| revenue_per_ga_lead | numeric | mtd_revenue / resolved_ga — efficiency metric |
| mtd_aov | numeric | mtd_revenue / mtd_invoice_count — rep average order value |
| mtd_pace_pct | numeric | mtd_revenue / daily_pace_target — ahead or behind |

### `weekly_team`

| Column | Type | Notes |
|--------|------|-------|
| week_start | date | Monday of the week (primary key) |
| new_leads | integer | Hyros NEW_LEADS metric (placeholder for Phase 1) |
| total_leads | integer | Hyros LEADS metric (placeholder for Phase 1) |
| revenue | numeric | Transaction log, apostille only |
| customers | integer | Invoice count from transaction log |
| close_rate_ga | numeric | Team blended GA close rate: won_ga / resolved_ga |
| close_rate_total | numeric | Team blended total close rate: won_total / resolved_total |
| won_ga | integer | Team total GA wins |
| resolved_ga | integer | Team total GA resolved |
| won_total | integer | Team total wins all sources |
| resolved_total | integer | Team total resolved all sources |
| aov | numeric | revenue / customers — team weekly average order value |
| last_updated | timestamp | When Bob last wrote this row |

### `config`

| Column | Type | Notes |
|--------|------|-------|
| key | text | Configuration key (e.g., 'monthly_goal') |
| value | text | Configuration value (e.g., '250000') |

---

## Validation Baseline

**April 2026 Manual Calculation:**
- Won leads (GA source): 133
- Lost leads (GA source): [calculated from data]
- Abandoned leads (GA source): [calculated from data]
- **Resolved (GA): 711**
- **Team GA Close Rate: 133 ÷ 711 = 18.7%**

**Dashboard Pass Criteria:** When Phase 1 is complete, View 1 (Team Daily Standup) must show 18.5% – 19.0% for the April week. If outside this range, debug before going live.

---

**Prepared by:** William Reese | Notary Pin | May 25, 2026 | Phase 1 of 3 | v5 (Final)
