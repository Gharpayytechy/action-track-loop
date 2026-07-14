# GHARPAYY Execution OS — 50x Plan

Not an attendance tracker. A **mission control** for the whole company: every operator's day is one connected, stage-gated journey with live proof, AI coaching, real-time manager oversight, streaks, and day-over-day continuity. Built on Lovable Cloud from day one — multi-user, real-time, persistent, auditable.

## The 50x shift

Old plan: local-only stepper on one browser.
New plan: **company-wide OS** — Cloud-backed, multi-tenant by role, real-time manager wallboard, AI scorecard using Lovable AI, WhatsApp-screenshot OCR to auto-count unread chats, geo + face-liveness on selfies, day continuity that rolls unresolved work forward, and a gamified scoreboard that ranks the whole floor live.

---

## 1. The Operator Journey (`/daily`)

A single vertical stepper. Each stage is a locked card until its proofs are submitted to Cloud. Everything auto-saves.

```text
① LOGIN SELFIE + geo + energy check
② MISSION — 3 priorities, measurable goal, biggest risk, expected finish
③ BASELINE — WhatsApp SS (OCR → unread count) + CRM snapshot numbers
④ ▶ BLOCK 1 (10:35–1:15) — live timer, KPI chip logger, AI nudges every 30 min
⑤ BREAK GATE @ 1:15 — selfie + INITIAL UPDATE (auto-filled) + WA SS (Δ vs baseline)
⑥ RESUME SELFIE
⑦ ▶ BLOCK 2 (1:30–5:00)
⑧ BREAK GATE @ 5:00 — selfie + ON-IT UPDATE + WA SS
⑨ RESUME SELFIE
⑩ ▶ BLOCK 3 (5:20–8:00)
⑪ IMPACT @ 8:00 — selfie + reflection + final WA SS
⑫ AI SCORECARD + tomorrow's first priority → rolls into tomorrow's ② Mission
```

**Hard gates** — cannot advance without: selfie captured, required fields filled, WA SS uploaded where required. Late gates emit red toasts + manager amber alerts.

**During-block behavior:**
- Live block timer.
- KPI chip logger: `+1 Call`, `+1 Connected`, `+1 Tour`, `+1 Prebook`, `+1 Move-in`, `+1 Super Lead`, `+1 Reinstate`, `+1 Chat`. Each tap writes a `kpi_event` row (auditable).
- Idle detection: no chip in 30 min → in-app nudge; 60 min → manager amber.
- SLA panel: user marks any chat >2h; each mark = red event on manager view.

---

## 2. AI (Lovable AI Gateway, server-side)

Three AI touchpoints, all `createServerFn` calling `openai/gpt-5.5`:

1. **WA screenshot OCR** — vision call on uploaded screenshot returns `{ unread: number, pinned: string[], stalest_hours: number }`. Auto-fills baseline/initial/onit/impact numbers.
2. **Mission planner** — reads yesterday's unresolved priorities + today's baseline unread count, suggests today's top-3 priorities as a one-click accept.
3. **Daily scorecard narrative** — at Impact, given the full day record, generates a 4-line coach note (win / gap / pattern / tomorrow) plus a copy-pasteable team-chat summary in the exact GHARPAYY reporting format.

Numeric scorecard is deterministic (pure fn); AI writes the narrative on top.

---

## 3. Manager Wallboard (`/admin/live`)

Real-time grid, one card per operator. Subscribes via Supabase Realtime to `day_records` + `kpi_events` + `stage_events`.

Per card: avatar + latest selfie thumb, current stage, elapsed-in-stage, KPI progress bars vs goal, WA-unread delta since baseline, risk chip (green/amber/red), last WA SS thumb (click to zoom).

Filters: date, pod, role, risk, "off-goal only", "SLA breach only", "missing proof only". Sort: risk desc, goal% asc, stage elapsed desc.

Bulk actions: nudge selected (writes a `manager_nudge` row → operator toast), open 1:1 for selected.

---

## 4. Admin Console (`/admin/console`, extend existing)

New tabs on the existing console:
- **Days** — every operator × every day, filter by date range/pod/role/goal-hit/score band; row expands to the full journey with all selfies + all WA SS + all KPI events on a timeline.
- **Trends** — per-operator 30-day charts (goal-hit %, avg score, SLA breaches, streaks).
- **Patterns** — AI-generated weekly patterns per operator ("misses target every Tuesday", "calls stop after 6 PM").
- **Streaks & Leaderboard** — company-wide ranking.

---

## 5. Gamification

Point rules stored in DB, calculated server-side on stage submit:
- Login ≤10:35 +10 · Mission set +10 · Baseline proof +10
- Each update on time +15 · Zero SLA breach in a block +25
- Impact on time +20 · Goal ≥100% +50 · CRM 100% +20
- Streak multipliers: 7d perfect attendance ×1.2, 14d zero SLA ×1.3, 30d goal-hit ×1.5

Feeds the existing Arena XP/coins/leaderboard.

---

## 6. Day continuity

- At Impact: `tomorrow_priority` field is required.
- Next morning's Mission stage prefills with: `tomorrow_priority` + any KPI shortfalls + unresolved unread-chat count.
- Missed goals roll forward as "carryover" chips shown at the top of Mission.

---

## 7. Data model (Lovable Cloud / Postgres)

All tables in `public`, RLS on, GRANTs per rules.

- `day_records` — 1 row per (user, date). Columns: user_id, date, stage, mission_priorities text[], mission_goal, mission_risk, expected_finish, energy int, energy_reason, kpi_goals jsonb, kpi_totals jsonb, scorecard jsonb, tomorrow_priority, ai_narrative, created_at, updated_at.
- `stage_events` — user_id, day_id, stage, entered_at, exited_at, selfie_path, geo point.
- `whatsapp_proofs` — user_id, day_id, checkpoint (`baseline|initial|onit|impact`), image_path, ocr jsonb, unread int, ts.
- `kpi_events` — user_id, day_id, kind (`call|connected|tour_sched|tour_done|prebook|movein|super_lead|reinstate|chat`), delta int, ts.
- `sla_breaches` — user_id, day_id, chat_hint, hours_stuck, ts.
- `manager_nudges` — from_user_id, to_user_id, day_id, note, ts, acked_at.
- `updates` — user_id, day_id, checkpoint (`initial|onit|impact`), body jsonb, ts.
- `daily_scores` — user_id, day_id, points int, breakdown jsonb, streaks jsonb.

Realtime enabled on: `day_records`, `stage_events`, `kpi_events`, `sla_breaches`, `updates`.

Storage buckets:
- `selfies` (private) — path `{user_id}/{date}/{stage}.jpg`
- `whatsapp` (private) — path `{user_id}/{date}/{checkpoint}.jpg`

RLS: operator sees own rows; managers/admins see all (via existing `has_role`).

---

## 8. Server functions

All in `src/lib/execution/*.functions.ts`:
- `startDay`, `submitMission`, `submitBaseline`
- `logKpiEvent`, `flagSlaBreach`
- `enterStage`, `exitStage` (uploads selfie via signed URL)
- `uploadWhatsappProof` (uploads image, kicks OCR)
- `submitUpdate` (initial/onit/impact)
- `finalizeDay` (computes scorecard, calls AI narrative, writes `daily_scores`, seeds tomorrow)
- Manager: `listLiveOps`, `sendNudge`, `listDaysFiltered`
- Admin: `getDayDetail`, `getOperatorTrends`, `getPatterns`

All protected with `requireSupabaseAuth` + role check where needed.

---

## 9. Files

Create:
- `src/routes/daily.tsx` (replace) — stepper shell
- `src/routes/_authenticated/admin/live.tsx` — wallboard
- `src/components/execution/`: `StageCard`, `SelfieCapture`, `WhatsAppUploader`, `KpiChipLogger`, `BlockTimer`, `SlaFlagger`, `Scorecard`, `RiskChip`, `ProofTimeline`, `ManagerCard`, `CarryoverChips`
- `src/lib/execution/store.ts` — TanStack Query hooks over the server fns + Realtime subscriptions
- `src/lib/execution/scorecard.ts` — pure numeric scorecard
- `src/lib/execution/*.functions.ts` — server fns above
- Migration for the 8 tables + RLS + GRANTs + Realtime publication
- Two storage buckets

Extend:
- `src/routes/admin.console.tsx` — Days / Trends / Patterns / Streaks tabs
- `src/components/AppShell.tsx` — add "Live Ops" link for manager+admin

---

## 10. Rollout (single build)

1. Migration + buckets + RLS.
2. Server fns (all of them) with Zod validators.
3. Operator stepper (`/daily`) end-to-end with Realtime writes.
4. Wallboard (`/admin/live`) with Realtime reads.
5. Admin console tabs + trends.
6. AI wiring (OCR, planner, narrative).
7. Gamification hooks into existing Arena XP.
8. Verify: Playwright walk the full journey as an operator, then screenshot the wallboard reflecting each stage change live.

## Explicit non-goals (v1)

- Real face-match / liveness detection (capture + geo only; verification comes later).
- WhatsApp Business API integration (screenshot OCR only).
- Push notifications (in-app + email only; push in v2).
- Mobile native app (PWA-friendly responsive web).
