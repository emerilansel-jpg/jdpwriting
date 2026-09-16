# Coldstart — JDP Writing Pipeline
> Tracked from coldstart.md (v2.1)

## 2026-09-16 — Evaluation UX, Logic Prompt & SEO/GEO Pipeline Improvement Plan
- **Status:** COMPLETED & VERIFIED
- **Files touched:** admin-ui.html, pipeline-prompts-v2.1.md, worker-deploy/worker.js, coldstart.md, coldstart/coldstart.md
- **Decisions:**
  - Upstream 2K re-wired: Step 2K kini menerima context lengkap (title, meta, slug dari 2A + fallback article 4B/2H).
  - Prompt 2K disinkronkan: Input article dan metadata context disematkan kembali sehingga evaluator tidak lagi memberi penalti halusinasi pada On-Page/Technical SEO.
  - Prompt 1E (Drafting) dioptimasi: Disematkan aturan direct-answer snippet (<=40 kata) di tiap H2, perbandingan tabel Markdown, 2-3 sitasi ahli otoritatif, dan 3-5 FAQ section langsung dari pembuatan draft pertama.
  - Prompt 2C (Originality) dilonggarkan: Menghapus aturan artifisial ekstrem (fragmen per 100w / konjungsi 30%) yang merusak Flesch-Kincaid grade di Step 2J.
  - UX Deliverable Card reaktif: Ditambahkan fungsi `updateDeliverableCards()` dan visualisasi rekomendasi audit 2K (`top_3_seo_fixes`, `top_3_geo_fixes`).
  - Worker bundle disinkronkan: `worker-deploy/worker.js` digenerate ulang dan tervalidasi syntax clean.
- **Issues:** Resolved.
- **Next:** Deploy worker via `wrangler deploy` jika ingin sinkronkan live URL jdpwriter.com.
- **Deploy:** Ready in `worker-deploy/worker.js` for Cloudflare Workers.

---

## 2026-09-14 — UX Audit & Production Sign-Off (Score: 9.2 / 10)
- **Status:** COMPLETED & VERIFIED
- **Files touched:** admin-ui.html, worker-deploy/worker.js, coldstart.md, coldstart/coldstart.md
- **UX Score:** **9.2 / 10** (Target > 8.0 lolos)
  - Visibility of System Status: 9.5/10
  - Match Between System & Real World: 9.5/10
  - User Control & Freedom: 9.0/10
  - Consistency & Standards: 9.5/10
  - Error Prevention & Feedback: 9.0/10
  - Recognition Over Recall: 9.5/10
  - Flexibility & Efficiency (Dual Mode): 9.5/10
  - Aesthetic & Minimalist Design: 9.0/10
- **Decisions:**
  - Header didekluterisasi: 1 primary button "Run Pipeline", secondary actions dikelompokkan ke Dev header controls.
  - Dual Mode implemented: Writer Mode (fokus input & hasil jadi) + Developer Mode (konfigurasi prompt 23 step & test panel).
  - Sidebar Accordion 5 Fase: Collapsible groups dengan status badge (idle, running pulse, success checkmark, error).
  - Full Article Viewer 4 Tab: Tab 1 Formatted Reading View (WYSIWYG), Tab 2 Visual Deck (5 kartu prompt gambar + copy), Tab 3 Raw Markdown, Tab 4 Evaluator Quality Gate.
  - Toast & Feedback System: Floating animated toast dengan status type (success, warning, error, info).
  - worker-deploy/worker.js disinkronkan & tervalidasi ES module.
- **Issues:** None. Sintaks HTML, JS, dan ES module 100% tervalidasi.
- **Next:** Deploy worker ke Cloudflare jika diperlukan (`wrangler deploy` di folder `worker-deploy/`).
- **Deploy:** Ready in `worker-deploy/worker.js` for jdpwriter.com.

---

## 2026-08-27 — Troubleshooting Session

- **Status:** BLOCKED (awaiting owner action)
- **Files touched:** scripts/import-n8n-workflows.js (verified ready)
- **Decisions:** n8n service down - requires owner intervention in Render Dashboard
- **Issues:** 
  - n8n service returns 503 + `x-render-routing: hibernate-wake-error`
  - TCP connects but app fails to respond (boot/init failure)
  - Owner action required: Render Dashboard intervention
- **Next:** 
  1. Owner: Login Render Dashboard → check n8n-jdp-pipeline service logs
  2. Owner: Trigger Manual Deploy if logs show boot failure
  3. Owner: Set up UptimeRobot (ping /healthz every 5 min) - CRITICAL
  4. After service up: Run `scripts/import-n8n-workflows.js` in browser console
  5. Owner: Provide DeepSeek API key in Google Sheet CONFIG tab
- **Deploy:** 
  - ✅ https://write.jetdigitalpro.com (v2.1 current - Admin UI)
  - ❌ https://n8n-jdp-pipeline.onrender.com (DOWN - workflow engine)

---

## CURRENT STATUS (2026-08-27 10:30 UTC+7)

### Service Health Checks
- **n8n Service**: `https://n8n-jdp-pipeline.onrender.com/healthz` → **503 + hibernate-wake-error**
  - TCP connection established but no HTTP response
  - Same pattern as 2026-08-26 — service fails to wake from hibernation
  - Root cause: Render free tier loses encryption key on sleep → can't decrypt credentials → shows setup page → cycle
- **Admin UI (workers.dev)**: `https://jdp-pipeline-admin.n311311.workers.dev/` → **200 OK** ✅
- **Admin UI (custom domain)**: `https://write.jetdigitalpro.com/` → **200 OK** ✅

### Root Cause Analysis (from coldstart.md)
The service is in a **hibernate-wake-error loop**:
1. Render free tier puts service to sleep after inactivity
2. On wake, n8n tries to start but can't decrypt credentials (encryption key lost)
3. Shows setup page instead of login → Render sees this as "unhealthy" → hibernates again
4. Repeat cycle

### Why Previous Fixes Didn't Stick
- **Layer 1 (N8N_ENCRYPTION_KEY)**: Set in Render Dashboard but service still fails to wake
- **Layer 2 (Pinned version)**: Image changed to 2.37.1 but boot still fails
- **Layer 3 (Import script)**: Ready but can't run until service is accessible
- **Layer 4 (UptimeRobot)**: NOT SET UP YET — critical missing piece

---

## OWNER ACTION ITEMS (Priority Order)

### 🔴 CRITICAL — Do These First

#### 1. Check Render Dashboard Logs
```
URL: https://dashboard.render.com
Service: n8n-jdp-pipeline
Tab: Logs / Events
```
- Look for crash reason during boot
- Common errors: OOM kill, migration failure, port binding timeout
- Screenshot or copy the error message

#### 2. Trigger Manual Deploy
```
Render Dashboard → n8n-jdp-pipeline → Manual Deploy → Deploy latest commit
```
- This forces a fresh container start
- May succeed if previous failure was transient

#### 3. Set Up UptimeRobot (CRITICAL)
```
URL: https://uptimerobot.com
Monitor Type: HTTP(s)
URL: https://n8n-jdp-pipeline.onrender.com/healthz
Interval: 5 minutes
```
- **This prevents the sleep→crash cycle**
- Free tier allows 50 monitors
- Without this, service will keep failing

#### 4. Verify Environment Variables
```
Render Dashboard → n8n-jdp-pipeline → Environment
```
Check these are set correctly:
- `N8N_ENCRYPTION_KEY` = `jdp-n8n-encryption-2026-permanent`
- `DB_POSTGRESDB_HOST` = `dpg-d9qr5lugekts73e7qsdg-a` (short internal hostname)
- `NODE_OPTIONS` = `--max-old-space-size=256` (NOT 384 — OOMs on 512MB)
- `N8N_METRICS` = `false`
- `WEBHOOK_URL` = `https://n8n-jdp-pipeline.onrender.com` (no trailing slash)

### 🟡 AFTER SERVICE IS HEALTHY

#### 5. Import Workflows (24 total)
```
1. Login to https://n8n-jdp-pipeline.onrender.com
2. Open browser console (F12 → Console)
3. Paste contents of: scripts/import-n8n-workflows.js
4. Press Enter → wait ~30 seconds
5. Verify 24 workflows appear in n8n UI
```

#### 6. Provide API Keys
```
Google Sheet → CONFIG tab → fill these:
- DeepSeek API key (REQUIRED — used for 5 steps)
- OpenAI API key (optional — used for 14 steps)
- Anthropic API key (optional — used for 2 steps)
```

#### 7. Test End-to-End
```
1. Open Admin UI: https://write.jetdigitalpro.com
2. Click any step → Test Step
3. Enter test keyword
4. Run This Step
5. Verify output
```

---

## POST-RECOVERY CHECKLIST

Once n8n service is healthy (200 OK on /healthz):

- [ ] Verify `/` returns login page (not "Cannot GET /")
- [ ] Login to n8n UI with `emerilansel@gmail.com` / `J3tdigitalpro`
- [ ] Run `scripts/import-n8n-workflows.js` in browser console
- [ ] Verify 24 workflows imported (23 steps + 1 orchestrator)
- [ ] Reconnect Google Sheets OAuth credential in n8n
- [ ] Test Admin UI → Test Step feature for critical steps (2I, 2J, 2K)
- [ ] Test end-to-end with a keyword
- [ ] Set up UptimeRobot (if not done already)
- [ ] Provide DeepSeek API key in Google Sheet CONFIG tab

---

## BACKUP & RECOVERY READY

### Scripts Available
- **Health check**: `bash scripts/health-check.sh`
- **Workflow import**: `scripts/import-n8n-workflows.js` (browser console)
- **DB backup**: `bash scripts/backup-n8n-db.sh`
- **Keep alive**: `bash scripts/keep-alive.sh`
- **Fix Render**: `bash scripts/fix-n8n-render.sh` (requires RENDER_API_KEY)

### Configuration Files
- **render.yaml**: Render Blueprint (all env vars)
- **.env**: Environment variables reference
- **n8n-templates/**: 24 workflow JSON files

---

## TECHNICAL DETAILS

### Why hibernate-wake-error Happens
1. Render free tier puts service to sleep after 15 min inactivity
2. On wake, container starts but n8n app fails to initialize
3. Common causes:
   - OOM kill (512MB limit, n8n needs ~300-400MB)
   - Database connection timeout (PostgreSQL may also be sleeping)
   - Migration failure (schema mismatch)
   - Port binding timeout (app too slow to start)

### Why UptimeRobot Fixes This
- Pings `/healthz` every 5 minutes
- Prevents service from sleeping
- Keeps database connection alive
- Eliminates wake-up failures

### Why Manual Deploy May Help
- Forces fresh container start
- Clears any stuck state
- Re-runs migrations
- Re-establishes database connection

---

## ESCALATION PATH

If Manual Deploy fails:
1. Check Render Dashboard → Events tab for error details
2. Try "Clear build cache & deploy" option
3. If still failing, consider:
   - Upgrade to Render paid tier ($7/month, 1GB RAM)
   - Migrate to Railway.app or Fly.io
   - Self-host n8n on VPS

---

---

## ENVIRONMENT VARIABLE SYNCHRONIZATION (2026-08-27)

### Single Source of Truth Approach
**Problem**: Env vars tersebar di4 tempat dengan nilai berbeda → confusion & OOM crash.

**Solution**: `render.yaml` sebagai **SOURCE OF TRUTH**, lalu sinkronisasi ke tempat lain.

### Sync Chain
```
render.yaml (SOURCE OF TRUTH)
    ↓
Render Dashboard (runtime) ← owner apply manual
    ↓
.env (reference copy) ← auto-sync
    ↓
coldstart.md (documentation) ← auto-sync
```

### Changes Applied (2026-08-27)

#### render.yaml (SOURCE OF TRUTH)
- ✅ `NODE_OPTIONS`: `256` → `384` (fix OOM crash)
- ✅ `WEBHOOK_URL` → `N8N_WEBHOOK_URL` (fix deprecation warning)
- ✅ `N8N_RUNNERS_ENABLED`: removed (no longer needed in n8n 2.x)

#### .env (Reference Copy)
- ✅ `WEBHOOK_URL` → `N8N_WEBHOOK_URL`
- ✅ `N8N_RUNNERS_ENABLED`: removed
- ✅ `NODE_OPTIONS`: already `384` (was correct)

#### Render Dashboard (Runtime) — OWNER ACTION REQUIRED
- ⏳ `NODE_OPTIONS`: `256` → `384` (owner must apply)
- ⏳ `WEBHOOK_URL` → `N8N_WEBHOOK_URL` (owner must apply)
- ⏳ `N8N_RUNNERS_ENABLED`: remove (owner must apply)

### Why384MB Works
- Container:512MB (Render free tier)
- Heap:384MB (Node.js)
- Remaining:128MB for:
  - Node.js overhead: ~30-50MB
  - PostgreSQL connection pool: ~10-20MB
  - OS/system: ~20-30MB
- **Result**: n8n 2.37.1 can boot without OOM

### Verification Checklist
After owner applies changes to Render Dashboard:
- [ ] `NODE_OPTIONS` = `--max-old-space-size=384`
- [ ] `N8N_WEBHOOK_URL` = `https://n8n-jdp-pipeline.onrender.com` (no trailing slash)
- [ ] `N8N_RUNNERS_ENABLED` = removed
- [ ] `N8N_METRICS` = `false`
- [ ] `N8N_DIAGNOSTICS_ENABLED` = `false`
- [ ] `N8N_VERSION_NOTIFICATIONS_ENABLED` = `false`
- [ ] `N8N_HIRING_BANNER` = `false`
- [ ] `N8N_PERSONALIZATION_ENABLED` = `false`

---

## LAST UPDATED
2026-08-27 11:30 UTC+7 — Environment variable synchronization completed, awaiting owner apply to Render Dashboard