# Notary Pin — Rep Performance Coaching Dashboard

Real-time rep performance metrics for weekly coaching conversations.

## What It Does

Answers three questions every morning:
1. **Which rep is struggling on Google Ad leads?** (GA-only close rate by rep)
2. **How is each rep performing overall?** (Total close rate by rep, all sources)
3. **Are we pacing to hit the monthly revenue target?** (MTD actual vs daily pace)

Updates 2x daily (7:45am and 2:30pm Colombia time). Data pulls from GHL pipeline and transaction log, stored in Supabase, displayed via Vercel frontend.

## Tech Stack

- **Backend data pulls:** Python (Bob, VPS)
- **Database:** Supabase (PostgreSQL)
- **Frontend:** Next.js + React
- **Deployment:** Vercel
- **Scheduler:** Cron (Bob's VPS)

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase project (free tier OK)
- GHL API key
- Transaction log (Excel/CSV)
- Python 3.9+ (for Bob's data pull script)

### 1. Set Up Supabase

```bash
# Run migrations in Supabase SQL editor
psql -U postgres -d postgres < ./backend/migrations/001_init_schema.sql
```

### 2. Set Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run Frontend

```bash
npm install
npm run dev
```

Dashboard will be at `http://localhost:3000`

### 4. Deploy to Vercel

```bash
git push origin main
# Vercel auto-deploys on push
```

### 5. Set Up Bob's Data Pulls (VPS)

See `./backend/BOB_SETUP.md` for cron configuration.

## Project Structure

```
notarypin-dashboard/
├── README.md (this file)
├── frontend/
│   ├── pages/
│   │   ├── index.tsx (dashboard home)
│   │   ├── api/ (API routes if needed)
│   ├── components/
│   │   ├── TeamStandupTable.tsx (View 1)
│   │   ├── RepCloseRateTable.tsx (View 2)
│   │   ├── RevenueByRepTable.tsx (View 3)
│   │   ├── SupabaseClient.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── queries.ts
│   ├── styles/
│   │   ├── globals.css
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│
├── backend/
│   ├── migrations/
│   │   ├── 001_init_schema.sql (Supabase schema)
│   ├── scripts/
│   │   ├── bob_data_pull.py (GHL API + transaction log → Supabase)
│   ├── BOB_SETUP.md (VPS cron configuration)
│
├── docs/
│   ├── BRIEF.md (phase 1 spec)
│   ├── VERIFICATION_CHECKLIST.md
│   ├── API_SCHEMA.md (table details)
```

## Verification

Before going live, validate dashboard numbers against April baseline:
- **Baseline:** 133 won / 711 resolved = 18.7% team GA close rate
- **Dashboard target:** 18.5% – 19.0% (±1% variance acceptable)

See `docs/VERIFICATION_CHECKLIST.md` for full validation steps.

## Support & Debugging

### Dashboard shows "Last updated: X ago"
GHL API pull failed. Check Bob's VPS logs:
```bash
ssh bob-vps
tail -50 /root/.openclaw/workspace/logs/*.log
```

### Numbers don't match April baseline
Check `backend/scripts/bob_data_pull.py`:
- GHL source filter: `source.lower().contains('apostille')`
- Rep UUID map: confirm all 6 reps are mapped
- Date bucketing: leads by `created_date`, revenue by `Date Order Created`

### Cron jobs not running
Check Bob's crontab:
```bash
ssh bob-vps
crontab -l
```

Should show two entries at 7:45am and 2:30pm Colombia time.

## Next Steps (After Phase 1)

- **Phase 2:** Add rep-level AOV, upsell capture rate, lead volume trends
- **Phase 3:** Behavioral scorecard (script compliance, payment timing) via AssemblyAI transcripts

---

**Built with:** Next.js, Supabase, Vercel, Python  
**Last updated:** May 25, 2026
