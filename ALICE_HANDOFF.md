# Alice — VPS Infrastructure Setup Handoff

**From:** Tom (frontend/dashboard builder)  
**To:** Alice (infrastructure manager)  
**Date:** May 25, 2026  
**Task:** Set up Bob's VPS cron jobs for Rep Performance Coaching Dashboard Phase 1

---

## What You're Doing

Bob needs to pull GHL pipeline + transaction log data 2x daily (7:45am, 2:30pm Colombia time) and write it to Supabase. The frontend dashboard is already live at https://notarypin-dashboard.vercel.app — it's just waiting for data.

Your job: Set up the automated data pulls on Bob's VPS.

---

## Files You Need

1. **Instructions:** `backend/BOB_SETUP.md` in the notarypin-dashboard repo
   - Clone: `git clone https://github.com/waj4ever16/notarypin-dashboard.git`
   - Follow the steps in `backend/BOB_SETUP.md` exactly

2. **Script:** `backend/scripts/bob_data_pull.py`
   - Already in the repo you just cloned

---

## Credentials (Keep Secure)

These go in Bob's VPS environment. William has these:

- **SUPABASE_URL:** `https://knwtzxgfbqmfiexogeuz.supabase.co`
- **SUPABASE_KEY (Service Role):** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtud3R6eGdmYnFtZmlleG9nZXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY1MDUyNywiZXhwIjoyMDk1MjI2NTI3fQ.3E6YLntU96tcOjfJs2Vfyvm69GJrYIfhIC6iJZfOQXA`
- **GHL_API_KEY:** (get from Jonathan/Arturo)
- **GHL_LOCATION_ID:** (get from Jonathan/Arturo)
- **TRANSACTION_LOG_PATH:** (wherever William stores the Excel file, e.g., `/root/.openclaw/workspace/transaction_log.xlsx`)

---

## Quick Overview of BOB_SETUP.md Steps

1. **Install Python packages** on VPS
2. **Set environment variables** (credentials above)
3. **Test the script manually** (`python3 bob_data_pull.py`)
4. **Set up cron jobs** (7:45am and 2:30pm Colombia time)
5. **Verify** data appears in Supabase tables

---

## What Success Looks Like

✅ Cron jobs running at 7:45am and 2:30pm Colombia time  
✅ No errors in `/root/.openclaw/workspace/logs/bob_data_pull.log`  
✅ Data appearing in Supabase tables (`rep_close_rate`, `rep_revenue`, `weekly_team`)  
✅ Dashboard at https://notarypin-dashboard.vercel.app shows data populating

---

## Expected Time

~30 minutes (mostly waiting for cron jobs to run)

---

## Questions?

- Refer to `backend/BOB_SETUP.md` in the repo for detailed troubleshooting
- Tom is available if there are blockers

---

**Next Step After This:** William validates dashboard numbers against April baseline (18.7% team GA close rate ±1%), then we go live.
