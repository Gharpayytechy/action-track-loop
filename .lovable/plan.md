# Execution OS v3 — Configurable, Multi-Role, Admin-Controlled

The daily flow is no longer hardcoded. **Admin picks the playbook, admin toggles which fields/proofs/KPIs appear for each person.** New roles = new playbook in seconds. Everything a person submits streams into Admin/HR dashboards live, in one go.

---

## 1. Roles (10 built-in + Generic + Custom)

| Role | Focus |
|---|---|
| **Generic Employee** | Universal fallback — login, mission, 2 blocks, EOD. Works for any function. |
| Operator | Move-ins, WA chats, super leads |
| TCM / Tour Consultant | Tours booked, done, converted |
| Sales Closer | Calls, demos, deals, revenue |
| HR / Recruiter | Screens, interviews, offers |
| Floor Lead | 1:1s, nudges, team goal% |
| Ops Manager | Site checks, escalations, SLA |
| Marketing | Leads generated, campaigns, spend |
| Finance | Collections, invoices, reconciliations |
| Support | Tickets, FRT, CSAT |
| Leadership | War room review, EOD company snapshot |
| **Custom** | Admin defines from scratch in Playbook Builder |

---

## 2. Playbook Builder (`/admin/playbooks`) — the core new surface

Admin builds/edits playbooks visually. A playbook = ordered list of **Stages**. Each stage has:

- name, icon, time window (optional)
- required proofs (selfie, WA screenshot, CRM screenshot, geo, file upload) — each toggleable
- **Field library** (checkboxes): pick from 40+ prebuilt fields:
  - text: mission_1/2/3, biggest_risk, tomorrow_priority, blockers, wins, reflection
  - number: calls, connected, tours_sched, tours_done, prebook, movein, super_lead, reinstate, deals, revenue, leads, screens, interviews, offers, tickets, invoices, collections, spend
  - single-select: energy (1–5), sentiment, risk
  - multi-select: tags, pods
  - **Custom field**: admin defines label + type + validation on the fly
- required KPI chips (subset of number fields shown as +1 tap chips)
- scoring weight (how much this stage contributes to daily score)
- WhatsApp template toggle (does this stage generate a WA-copy block?)

Playbook is JSON in `playbooks` table (RLS: admin write, everyone read own assignment). Versioned — editing creates v2, active users finish today on v1.

---

## 3. Per-user overrides (`/admin/people/:id/execution`)

Even after assignment, admin can **override any field per person**: add/remove a field, change required→optional, change goal target, hide a stage, add a custom one-off field ("Client X follow-up today?"). Overrides live in `user_playbook_overrides` and merge on top at render time.

Bulk actions: apply override to a team / hub / role in one click.

---

## 4. Field Library (`/admin/fields`)

CRUD for the field library itself. Admin can create new field types, group them (Sales / Support / Ops / HR / Custom), pin favorites, archive obsolete ones. Every field carries: id, label, type, unit, validation, default target, description shown to operator.

---

## 5. Daily flow (`/daily`) — fully driven by resolved playbook

Stepper reads: `resolvePlaybook(user) = merge(playbook, roleOverrides, userOverrides)` → renders. Zero hardcoded stages. Zero role branching in components. Add a new role → add a playbook → done.

Every submit:
- writes stage_event + field values to store
- generates a **WhatsApp block** using the stage's template + submitted values
- streams to `/admin/ops` live via the store's subscribe

---

## 6. Admin/HR Dashboard (`/admin/ops`) — 5 tabs

**a) Live Wallboard** — every active person, current stage, KPI bars, risk chip, filters: role · team · hub · manager · tier · risk · "missed gate" · "off goal".

**b) Timeline** — per-person full-day playback: selfies + proofs + KPI events + updates + WA blocks (copyable).

**c) Analytics** — presets: Today · Week · Month · Quarter · YTD · Custom range. Charts: goal-hit %, avg score, SLA rate, KPI totals rolled up by any field. Group by: day/week/month/quarter/user/role/team. CSV export.

**d) Stack & Queue** — task-manager style:
- Stack (urgent action): pending leaves, unacked nudges, missed gates, red-flag operators
- Queue (scheduled today): 1:1s, interviews, tours, EOD reviews
- Drag between lanes, assign owner

**e) Configuration** — links to Playbook Builder, Field Library, Per-user Overrides, Score Weights. One place for admin to shape the whole system.

---

## 7. WhatsApp copy-paste everywhere

Every stage submit → WhatsApp block appears with "Copy" + "Open WhatsApp" (`wa.me/?text=...`). Admin dashboard's Timeline shows the same block copyable per event. Template per stage is editable in Playbook Builder (Handlebars-style `{{mission_1}}`).

Default templates match the GHARPAYY reporting format the user pasted earlier (Initial / On-it / Impact / EOD).

---

## 8. Time-range aggregation

`aggregate(records, { from, to, groupBy, filters })` in `src/lib/execution/aggregate.ts`. Powers every chart, table, CSV, and the Solo view. Ranges: day, week, month, quarter, YTD, custom.

---

## 9. Solo mode

If workspace has 1 active user OR admin toggles Solo in settings, dashboard collapses to personal stack + personal timeline + personal streak (no team filters).

---

## 10. Data model additions

- `playbooks` — id, name, role_hint, version, stages jsonb, active bool
- `user_playbook_assignments` — user_id, playbook_id, effective_from
- `user_playbook_overrides` — user_id, stage_id, field_id, override jsonb
- `field_library` — id, label, type, unit, validation jsonb, group, archived
- `wa_templates` — playbook_id, stage_id, template text
- Existing `day_records`, `stage_events`, `kpi_events`, `whatsapp_proofs`, `exec_updates`, `daily_scores` reused as-is (they're already schema-flexible via jsonb).

All local-first now via `execution-os-store`; cloud wiring later — zero component changes needed.

---

## 11. Files

**New**
- `src/lib/execution/playbooks.ts` — 11 default playbooks (Generic + 10 roles)
- `src/lib/execution/field-library.ts` — 40+ fields
- `src/lib/execution/resolve.ts` — merge playbook + overrides
- `src/lib/execution/wa-format.ts` — Handlebars-lite template render
- `src/lib/execution/aggregate.ts` — time-range rollup
- `src/lib/execution/playbook-store.ts` — CRUD + assignments + overrides
- `src/components/execution/WhatsAppCopyBlock.tsx`
- `src/components/execution/StageRenderer.tsx` — one component, any stage
- `src/components/execution/FieldRenderer.tsx` — one component, any field type
- `src/routes/admin.ops.tsx` — 5-tab dashboard
- `src/routes/admin.playbooks.tsx` — visual builder
- `src/routes/admin.fields.tsx` — field library CRUD
- `src/routes/admin.people.$id.execution.tsx` — per-user overrides

**Refactored**
- `src/routes/daily.tsx` — playbook-driven, no hardcoded stages
- `src/routes/live.tsx` — folded into `/admin/ops` Live tab
- `src/components/AppShell.tsx` — nav: Daily, Ops Dashboard (admin/HR), Configuration (admin)

---

## 12. Rollout (one build, ships today)

1. Field library + 11 default playbooks + resolver.
2. Refactor `/daily` to be fully playbook-driven.
3. WA copy component + templates on every stage.
4. Playbook Builder + Field Library + Per-user Overrides.
5. `/admin/ops` 5-tab dashboard with filters, timeline, analytics, stack/queue.
6. Time-range aggregation + CSV export.
7. Playwright: switch role via override → verify daily flow changes → verify admin sees it live → screenshot each tab.

## Non-goals (v3)

- Real WhatsApp API send (copy-paste + wa.me deep link only).
- Cloud realtime writes (schema ready; local-first now).
- Push notifications.
- AI-generated playbooks (admin builds manually; AI suggest in v4).
