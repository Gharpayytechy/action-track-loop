# BUILD ALL IN ONE 

# GO 

# 100x Arena: The "Workspace as a Game" Master Plan

You asked for the best workspace product ever — gamified like a game you can't put down, but built for serious work, with a 90/10/10 cadence (work / rest / break) and the goals: **consistency, dedication, accountability, motivation, growth at GHARpayY**.

This plan is the contract. I will execute it in safe phases so nothing breaks. I fixed the homepage hydration bug already.

---

## Phase 0 — Foundations (this turn after you approve)

These power every module, so they ship first and everything else plugs in.

1. **XP + Streaks Engine** (`src/lib/xp-engine.ts`)
  - Every meaningful action awards XP: check-in on time, task on-time, kudo given/received, 1:1 completed, candidate moved forward, leave approved within SLA, EOD shipped, focus session finished.
  - Daily streak, weekly streak, "perfect day" badge (90/10/10 hit).
  - Levels 1–100 with titles ("Rookie → Operator → Closer → Lead → Captain → Legend").
2. **90/10/10 Cadence Timer** (`src/components/CadenceTimer.tsx`)
  - Floating dock: 50-min work block → 5 rest → 5 break, repeats.
  - Locks distractions panel, auto-logs focus time onto the active task.
3. **Quest System** (`src/lib/quests.ts` + `src/routes/quests.tsx`)
  - Daily quests (5), weekly quests (3), seasonal campaign (1).
  - Per-role quest packs reusing `playbooks.ts`.
4. **Live Notifications + Toaster upgrade** — every XP/level/quest event surfaces.

## Phase 1 — Every existing module, 100x


| Module              | What lands                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Attendance**      | Geo-fence stub, selfie-streak, late-recovery quest, overtime guardrails, monthly heatmap, "first in / last out" leaderboard.     |
| **Tasks**           | Pomodoro link, dependencies, recurring tasks, templates, sprint board, WIP limits, blocker pings, auto-XP on close.              |
| **Leaves**          | Balance ledger, auto-approve under policy, swap-shift marketplace, comp-off, leave forecast for managers.                        |
| **Kudos**           | Weekly nominations, "Kudo Tokens" budget per giver, public wall of fame, anonymous option, kudo → XP multipliers.                |
| **1:1s**            | Auto-agenda from last week's blockers, sentiment trend chart, action-item carryover, skip-warning, growth plan tab.              |
| **Recruiting**      | Pipeline SLAs, recruiter scorecard, candidate self-schedule link, structured interview kits, offer letter generator, source ROI. |
| **Calendar**        | Day/Week/Month, conflict detection, focus-time blocks, team availability stack, quiet hours.                                     |
| **Score**           | New radar chart, peer compare, growth trajectory, "next level needs" coaching cards.                                             |
| **War Room**        | Live ticker, mute-by-default, raise-hand, pinned wins, daily standup auto-room.                                                  |
| **Console**         | Per-role morning briefing AI, EOD auto-draft, hard-decision log → CEO inbox.                                                     |
| **People / Roster** | Org chart with depth, skill tags + search, who-can-help, birthdays/anniversaries strip.                                          |
| **Inbox**           | Unified: notifications + approvals + mentions + kudos + tasks; bulk actions; SLA timer.                                          |


## Phase 2 — New modules (the "10-year-ahead" stuff)

1. **Arena Quests & Missions** — daily/weekly/seasonal with rewards, public progress bars.
2. **Achievements 2.0** — 60+ badges across consistency, mastery, team play, leadership.
3. **Guilds / Squads** — opt-in cross-team groups with their own leaderboard.
4. **Coin Economy (`GHARp`)** — earn coins, spend on perks (early Friday, lunch on company, swap shift). Manager-funded budget.
5. **Reward Shop** (`/shop`) — perks catalog, redeem flow, manager approval.
6. **Skill Tree** (`/growth`) — per role, unlock skills with proof-of-work, ties into promotions.
7. **Town Hall** (`/town-hall`) — broadcasts, polls, AMA queue, recordings list.
8. **Wellness** (`/wellness`) — mood check-in, hydration/break nudges, burn-out radar for managers.
9. **Learning Hub** (`/learn`) — micro-courses, weekly drill, quiz XP, certifications.
10. **Goals & OKRs** (`/goals`) — company → team → personal cascade, weekly check-in, confidence score.
11. **Compensation & Payroll signals** (admin only) — variable pay tied to score, payslip preview.
12. **Compliance Center** — policies, ack tracking, expiry alarms.
13. **Asset & IT Desk** — laptop/SIM/seat assignments, ticket queue.
14. **Vendor / Partner CRM** — light pipeline distinct from candidates.
15. **Customer Pulse** — NPS, complaints triage, link to Operators' scores.
16. **Analytics Studio** — saved queries, dashboards per role, export CSV.
17. **AI Coach** (Lovable AI) — daily nudge, EOD summary, 1:1 prep, candidate screen draft.
18. **Public Career Page generator** — pulls open roles from Recruiting.

## Phase 3 — New roles + permissions

Add to `permissions.ts` (tiers + capabilities):

- **CEO / Founder** (above Leadership; sees money)
- **COO** (cross-pod ops)
- **CFO / Finance** (payroll, coin economy treasury)
- **CTO / Tech Lead**
- **Trainer / L&D** (owns Learning Hub)
- **Wellness Officer** (owns Wellness, burnout alerts)
- **Compliance Officer**
- **Intern / Trainee** (limited surface, mandatory learning)
- **Contractor** (time-boxed access)
- **Client / Guest** (read-only specific boards)

Permission matrix expanded for every new capability above.

## Phase 4 — Game layer that makes people *want* to log in

- **Daily Login Streak** with escalating rewards (coins + XP).
- **Morning Standup mini-game** — 60s tap-through: "what I did / will do / blockers".
- **Power Hour** — every day 11:00–12:00, 2× XP for closing tasks.
- **Boss Battles** — quarterly team challenge (revenue, hiring, NPS); live progress, victory cinematic.
- **Seasons** — 3-month arcs with seasonal leaderboard + rewards reset.
- **Confetti, sound, haptics** on every win (toggleable).
- **Theme unlocks** — earn dark/neon/retro arena themes with level-ups.

## Phase 5 — Quality, safety, accessibility

- All new state goes through `makeStore` (works today on localStorage, swappable to the VPS API later).
- Every new route gets `head()` SEO meta.
- Mobile-first review of every page at 375×667.
- Empty states + skeletons everywhere.
- Keyboard shortcuts via existing CommandPalette.
- Accessibility: focus rings, aria labels, contrast pass.

---

## Technical execution order (what I'll actually do, turn by turn)

This is too big for one turn — anyone who promises that ships a broken app. Here's how it lands without breaking:

1. **Turn A — Foundations:** XP engine, streaks, cadence timer, quest store, level toasts, role expansion in `permissions.ts`. Wire XP into existing task/attendance/kudos/1:1 events. *Nothing visual breaks.*
2. **Turn B — Game shell:** `/quests`, `/shop`, `/growth`, `/wellness`, `/goals`, `/town-hall`, `/learn` routes with full UIs reading the new stores.
3. **Turn C — Module 100x pass 1:** Tasks, Attendance, Kudos, 1:1s deepened.
4. **Turn D — Module 100x pass 2:** Recruiting, Calendar, Score, War Room, Console, People, Inbox.
5. **Turn E — Boss Battles, Seasons, Power Hour, AI Coach (Lovable AI), confetti/sound/themes.**
6. **Turn F — Polish, mobile, a11y, SEO, empty states, command palette wiring.**

Each turn is self-contained and ships a working app. If something feels off after a turn, we course-correct before the next.

---

## GharPayy Arena — Full BRD & Lovable Build Prompt

## "Every Lead Becomes a Tour" OS

---

## BUSINESS REQUIREMENTS DOCUMENT (BRD)

**Product:** GharPayy Arena  
**Version:** 1.0 — Full Stack (All Phases)  
**North Star Metric:** Tours Scheduled + Tours Completed (Virtual + Physical + Direct Bookings)  
**Team:** TCMs (Tour Conversion Managers), Flow Ops (FOs), Flow Managers (FMs), CEO/Founder  
**Stack:** React + TypeScript + Tailwind + Vite + localStorage (API-swappable) via `makeStore`

---

### 1. NORTH STAR & PHILOSOPHY

Every feature, metric, quest, leaderboard, and notification in this product exists to answer one question:

> **Did the lead become a tour?**

The funnel is: Lead → Hype Call → Intent Classified → Visit Packet Sent → Tour Scheduled → Tour Done → Booking.

The system's job is to make skipping any step feel impossible — and completing every step feel like winning.

Tour types tracked:

- **Physical Tour** — in-person zone walkthrough
- **Virtual Tour** — video call walkthrough
- **Direct Booking** — lead converts without a formal tour (rare; auto-flagged for review)

---

### 2. ROLES & PERMISSIONS


| Role                    | Code      | Capabilities                                                          |
| ----------------------- | --------- | --------------------------------------------------------------------- |
| Tour Conversion Manager | `TCM`     | Owns leads post-tour, closes bookings, manages intent pipeline        |
| Flow Ops                | `FO`      | Hype calls, tour scheduling, Visit Packets, Zero Latency compliance   |
| Flow Manager            | `FM`      | Zone-level oversight, approvals, floor price violations, team XP view |
| Founder / CEO           | `CEO`     | Full system, coin treasury, compensation signals, promotion approval  |
| COO                     | `COO`     | Cross-zone ops, analytics, OKR management                             |
| Trainer / L&D           | `TRAINER` | Learning Hub, onboarding flows                                        |
| Intern / Trainee        | `INTERN`  | Limited surface, mandatory learning modules                           |


---

### 3. NORTH STAR DASHBOARD — "TOUR COMMAND CENTER"

The primary view for every user. Replaces generic "home dashboards." All data revolves around tour velocity.

**Widgets on Command Center:**

1. **Tour Pulse** — Live counter: Tours Scheduled Today / Tours Completed Today / Tours Pending
2. **Lead-to-Tour Funnel** — Horizontal funnel: Leads In → Hype Call Done → Intent Set → Packet Sent → Tour Booked → Tour Done
3. **Zero Latency Radar** — Real-time SLA compliance ring: % of leads touched within 2hr
4. **Tour Velocity Trend** — 7-day sparkline: tours per day vs target
5. **My Active Leads** — Card list with intent badge, last-touch timestamp, next action due
6. **Zone Tour Map** — City zone cards (Koramangala, Indiranagar, HSR, etc.) with live tour counts
7. **Today's Quests** — 5 quest tiles, progress bars, XP reward shown
8. **GHARp Balance + XP Bar** — Persistent top widget
9. **90/10/10 Cadence Timer** — Floating dock, always visible

---

### 4. INTENT PIPELINE (Core CRM — North Star Aligned)

Kanban board with 6 columns. Every lead lives here.


| Column         | Definition                           | SLA                              |
| -------------- | ------------------------------------ | -------------------------------- |
| New Lead       | Just assigned, no contact            | Hype call within 2hr             |
| Hype Called    | First contact made                   | Classify intent within same call |
| Intent Set     | Soft / Medium / Hard marked          | Send Visit Packet within 1hr     |
| Tour Scheduled | Date/time confirmed                  | Send reminder 24hr before        |
| Tour Done      | Tour completed                       | TCM follow-up within 2hr         |
| Booking / Lost | Converted or marked lost with reason | —                                |


**SLA Timers:** Visible countdown on each card. Red when overdue. Triggers XP penalty alert (not deduction — warning first).

**Lead Card shows:**

- Lead name + source (portal / referral / walk-in)
- Zone interested in
- Intent badge (color-coded: grey/yellow/orange/red/green)
- Last touch: "2hr ago by [FO name]"
- Visit Packet status (sent ✓ / not sent ✗)
- Tour type booked (Physical / Virtual / Direct)
- Next action chip: "Schedule Tour" / "Send Packet" / "Follow Up"

**Filters:** By Zone, By FO/TCM assigned, By intent level, By tour type, By SLA status

---

### 5. XP ENGINE — TOUR-FIRST EVENT MAP

All XP events are tied to tour progression. No busywork XP.

**Flow Ops XP Events:**


| Action                                                   | XP   |
| -------------------------------------------------------- | ---- |
| Hype call completed within 2hr of lead assignment        | +50  |
| Lead intent classified in same call                      | +20  |
| Visit Packet sent within 1hr of intent set               | +30  |
| Tour scheduled (any type)                                | +60  |
| Virtual tour scheduled                                   | +60  |
| Physical tour scheduled                                  | +60  |
| Direct booking assisted                                  | +80  |
| Zero Latency maintained all day (no lead >2hr untouched) | +100 |
| 2-Hour Pulse completed on stuck lead                     | +25  |
| Tour confirmed (Hard/Confirmed intent)                   | +40  |


**TCM XP Events:**


| Action                                              | XP   |
| --------------------------------------------------- | ---- |
| Intent upgraded per stage (Soft→Med→Hard→Confirmed) | +50  |
| Tour Done logged with outcome                       | +40  |
| Booking closed (post-tour)                          | +200 |
| Direct booking closed                               | +250 |
| Floor Price held (no discount)                      | +30  |
| RevPAB above zone target                            | +100 |
| Follow-up within 2hr of tour done                   | +35  |
| EOD report shipped on time                          | +20  |
| Referral lead converted to tour                     | +80  |
| Referral lead converted to booking                  | +150 |


**Shared XP Events:**


| Action                              | XP   |
| ----------------------------------- | ---- |
| Perfect attendance day              | +15  |
| 90/10/10 cadence: all 4 blocks done | +40  |
| Kudo given                          | +10  |
| Kudo received                       | +25  |
| Weekly tour target hit              | +300 |
| Daily tour target hit               | +80  |


---

### 6. QUEST SYSTEM

**Daily Quests — Flow Ops Pack (5/day):**

1. Complete 3 Hype calls before 12 PM → +100 XP + 50 GHARp
2. Zero Latency: every new lead touched within 2hr → +120 XP
3. Send Visit Packet to all today's scheduled tours → +80 XP
4. Schedule 2 physical or virtual tours before 3 PM → +150 XP
5. Log all leads with intent level before EOD → +60 XP

**Daily Quests — TCM Pack (5/day):**

1. Move 2 leads from Soft → Hard intent → +100 XP
2. Follow up within 2hr on every tour done today → +120 XP
3. Close 1 booking (any type) → +200 XP + 200 GHARp
4. Hold Floor Price on all conversations → +80 XP
5. Ship EOD report by 8 PM → +60 XP

**Weekly Quests (3 per week — both roles):**

1. Hit zone tour target 5 out of 5 days → +500 XP + 500 GHARp
2. Zero missed Hype calls all week (FO) / Zero post-tour follow-ups missed all week (TCM) → +400 XP
3. No lead goes untouched >24hr all week → +350 XP

**Boss Battle (Quarterly):**

- Zone vs Zone: most tours scheduled + completed in 90 days
- Live progress bar on leaderboard
- Winner: 3000 GHARp per team member + Founder Shoutout + trophy badge

---

### 7. LEVEL SYSTEM


| Levels | Title    | Perks Unlocked                                    |
| ------ | -------- | ------------------------------------------------- |
| 1–10   | Rookie   | Base access                                       |
| 11–25  | Operator | Shop unlocks tier 1, coin multiplier ×1.2         |
| 26–40  | Closer   | Custom avatar frame, tier 2 shop, multiplier ×1.5 |
| 41–60  | Lead     | Promotion eligibility trigger, tier 3 shop, ×1.8  |
| 61–80  | Captain  | Zone leadership access, ×2.0, seasonal badge      |
| 81–100 | Legend   | Permanent hall-of-fame, custom arena skin, ×2.5   |


Promotion triggers:

- Level 40 + 3 consecutive weekly targets → Senior FO / Senior TCM eligibility
- Level 60 + zone RevPAB top 3 for a quarter → Flow Manager eligibility
- Level 80 + managed zone 2+ months → City Lead eligibility

---

### 8. COIN ECONOMY — GHARp

**Earning:**

- Level up → 100–500 GHARp (scales with level)
- Quest complete → 50–200 GHARp
- Weekly tour target hit → 500 GHARp
- Daily tour target hit → 100 GHARp
- Kudo received → 20 GHARp
- Boss Battle win → 3000 GHARp

**Reward Shop Catalog:**


| Perk                                | Cost       |
| ----------------------------------- | ---------- |
| Early Friday (leave 1hr early)      | 500 GHARp  |
| Lunch on GharPayy                   | 800 GHARp  |
| Shift swap                          | 300 GHARp  |
| Founder Shoutout in all-hands       | 1000 GHARp |
| Work-from-home day                  | 1200 GHARp |
| Custom Arena theme unlock           | 200 GHARp  |
| Skip one non-critical meeting       | 400 GHARp  |
| Priority zone assignment for 1 week | 1500 GHARp |


---

### 9. ALL MODULES (COMPLETE LIST)

**Core Modules:**

- Tour Command Center (North Star dashboard)
- Intent Pipeline (Lead → Tour Kanban)
- Lead Feed (chronological activity stream)
- Hype Call Log (per-call record, Zero Latency tracking)
- Visit Packet Tracker (auto-checks before tour confirmation)
- Zone Dashboard (per-zone tour metrics live)
- Floor Price Guard (flags discount requests, manager approval queue)

**People & Performance:**

- Attendance (selfie-streak, geo-fence, heatmap, late-recovery quest)
- Score (radar chart, peer compare, next-level coaching)
- Kudos (wall of fame, kudo tokens, multipliers)
- 1:1s (auto-agenda, sentiment trend, action carryover)
- People / Roster (org chart, skill tags, who-can-help)
- Recruiting (pipeline SLAs, scorecard, offer letter generator)

**Gamification:**

- Arena Leaderboard (XP + GHARp + tours — filterable by zone, role, period)
- Quest Board (daily/weekly/seasonal with progress bars)
- Reward Shop (/shop)
- Skill Tree (/growth) — TCM and FO tracks
- Achievements (60+ badges)
- Boss Battles (quarterly, zone vs zone)
- Seasons (3-month arcs)

**Operations:**

- Tasks (sprint board, WIP limits, pomodoro, recurring, auto-XP)
- Leaves (balance ledger, swap-shift, comp-off, forecast)
- Calendar (conflict detect, focus blocks, team availability)
- Inbox (unified: notifications + approvals + mentions, SLA timers)
- War Room (live ticker, raise-hand, pinned wins, standup room)
- Console (per-role morning brief AI, EOD draft, decision log)

**Growth & Culture:**

- Goals & OKRs (/goals — company → zone → personal)
- Wellness (/wellness — mood check-in, burnout radar)
- Learning Hub (/learn — micro-courses, quiz XP, certs)
- Town Hall (/town-hall — broadcasts, polls, AMA)

**Game Layer:**

- 90/10/10 Cadence Timer (floating dock, always visible)
- Power Hour (11–12 PM daily, 2× XP)
- Daily Login Streak (escalating coin rewards)
- Morning Standup Mini-Game (60s tap-through)
- Confetti + Sound on tour/booking close (toggleable)
- Theme Unlocks (dark/neon/retro arena skins)

---

### 10. MANAGER VIEW (FM / CEO)

Real-time zone operations panel:

- Zone RevPAB vs target (live ring chart)
- Tours Scheduled Today vs target (per zone)
- Tours Completed Today vs target (per zone)
- Every FO's Zero Latency status (green/red)
- Every TCM's pipeline: leads in each intent stage
- Stuck leads: >2hr no touch (auto-flagged list)
- Floor Price violations pending approval
- Weekly quest completion rate per person
- Burnout radar: low XP + low attendance + negative mood trend
- Visit Packet compliance: % of tours with packet sent

---

## LOVABLE PROMPT

---

> **PASTE THIS ENTIRE BLOCK INTO LOVABLE AS YOUR FIRST MESSAGE:**

---

Build **GharPayy Arena** — a complete gamified internal operating system for a PG/co-living sales team. This is not a generic HR tool. This is a high-performance sales OS where every feature exists to answer one question: **did the lead become a tour?**

---

## NORTH STAR

The North Star metric is **Tours Scheduled + Tours Completed** (Virtual tours, Physical tours, and Direct Bookings). Every screen, widget, badge, quest, and XP event must tie back to tour conversion. The lead funnel is: Lead → Hype Call → Intent Classified → Visit Packet Sent → Tour Scheduled → Tour Done → Booking. The system makes skipping steps impossible and completing them feel like winning.

---

## TECH STACK

- React + TypeScript + Tailwind CSS + Vite
- All state via a `makeStore` utility wrapping `localStorage` (backend-swappable later)
- React Router v6 for routing
- Recharts for all charts
- Framer Motion for animations
- lucide-react for icons
- shadcn/ui components

---

## VISUAL DESIGN

Dark theme. Arena / war-room aesthetic. Think Bloomberg Terminal meets Duolingo — dense with live data but gamified and electric.

- Background: `#0A0C10` (near-black)
- Surface cards: `#111318` with `1px` border `#1E2128`
- Primary accent: `#F5A623` (amber/gold — for XP, tours, wins)
- Secondary accent: `#00E5FF` (cyan — for live data, real-time indicators)
- Success: `#00C48C` (green — for completed tours, bookings)
- Danger: `#FF4757` (red — for SLA breaches, overdue)
- Warning: `#FFD32A` (yellow — for approaching deadlines)
- Font: `Syne` (display/headings) + `JetBrains Mono` (data/numbers) + `Inter` (body)
- Animated number counters on all live metrics
- Pulsing green dot on all "live" indicators
- XP progress bar always visible in sidebar
- Confetti burst on tour completion and booking close (toggleable in settings)
- Level-up toast with sound icon

---

## ROLES

```typescript
type Role = 'TCM' | 'FO' | 'FM' | 'CEO' | 'COO' | 'TRAINER' | 'INTERN';

```

Each role sees a different sidebar, different dashboard widgets, different quest packs. Role is set at login (no auth needed — just a role selector screen with avatars and role descriptions for demo).

---

## FILE STRUCTURE

```
src/
  lib/
    xp-engine.ts        // All XP events, streak logic, level calculation
    quests.ts           // Daily/weekly/seasonal quest definitions + progress
    coin-store.ts       // GHARp balance, earn/spend transactions
    makeStore.ts        // localStorage wrapper (generic get/set/subscribe)
    permissions.ts      // Role → capabilities map
    tour-pipeline.ts    // Lead/tour state machine
  components/
    CadenceTimer.tsx    // 90/10/10 floating dock timer
    XPBar.tsx           // Global XP + level bar (sidebar)
    QuestCard.tsx       // Single quest tile
    LeadCard.tsx        // Kanban lead card
    TourPulse.tsx       // Live tour counter widget
    ZoneLane.tsx        // Zone card with live tour stats
    FloorPriceAlert.tsx // Discount flag component
    LevelUpToast.tsx    // Animated level-up notification
    StreakBadge.tsx     // Daily/weekly streak display
  routes/
    home.tsx            // Tour Command Center
    pipeline.tsx        // Intent Pipeline Kanban
    lead-feed.tsx       // Chronological lead activity
    hype-calls.tsx      // Hype Call Log
    visit-packets.tsx   // Visit Packet Tracker
    zones.tsx           // Zone Dashboard
    floor-price.tsx     // Floor Price Guard
    leaderboard.tsx     // Arena Leaderboard
    quests.tsx          // Quest Board
    shop.tsx            // Reward Shop
    growth.tsx          // Skill Tree
    achievements.tsx    // Achievements gallery
    score.tsx           // Personal score + radar
    attendance.tsx      // Attendance + streaks
    tasks.tsx           // Sprint board + tasks
    leaves.tsx          // Leave management
    kudos.tsx           // Kudos wall
    one-on-ones.tsx     // 1:1 meeting hub
    calendar.tsx        // Team calendar
    inbox.tsx           // Unified inbox
    war-room.tsx        // Live war room
    console.tsx         // AI briefing console
    people.tsx          // Org chart + roster
    recruiting.tsx      // Hiring pipeline
    goals.tsx           // OKRs
    wellness.tsx        // Mood + burnout
    learn.tsx           // Learning hub
    town-hall.tsx       // Broadcasts + polls
    settings.tsx        // Preferences + toggles

```

---

## CORE MODULES — BUILD ALL OF THESE

### 1. TOUR COMMAND CENTER (`/` — home)

The primary dashboard. All data circles back to tours.

**Widgets (arrange in a dense grid):**

- **Tour Pulse** — 3 animated number counters side by side:
  - "Scheduled Today" (amber)
  - "Completed Today" (green)
  - "In Progress" (cyan, pulsing)
  - Below each: vs yesterday delta with arrow
- **Lead-to-Tour Funnel** — Horizontal funnel bar showing:
  - Leads In → Hype Called → Intent Set → Packet Sent → Tour Booked → Tour Done
  - Each stage shows count + conversion % from previous stage
  - Drop-off stages highlighted in red
- **Zero Latency Radar** — Circular SLA compliance gauge
  - "% of leads touched within 2hr today"
  - Green ≥90%, Yellow 70–89%, Red <70%
  - Animated ring fill
- **Zone Tour Map** — Grid of zone cards (Koramangala, Indiranagar, HSR Layout, Whitefield, Marathahalli, Bellandur)
  - Each card: zone name, tours scheduled today, tours done today, progress bar vs target, assigned FO/TCM avatars
- **My Active Leads** — Card list (current user's leads)
  - Lead name, source badge, intent level badge, last touch ("2hr ago"), next action chip, SLA countdown
- **Tour Velocity Trend** — 7-day line chart, tours per day vs target line
- **Today's Quests** — 5 quest tiles in a horizontal scroll, each with progress bar and XP reward
- **90/10/10 Timer** — Floating dock bottom-right (always visible across all pages):
  - Current block: Work (50m) / Rest (5m) / Break (5m)
  - Progress arc
  - Tap to pause/resume
  - "Active Task" label
  - Completing all 4 blocks today = "Perfect Day" badge + 40 XP toast
- **GHARp + XP** — Sidebar widgets always visible

---

### 2. INTENT PIPELINE (`/pipeline`) — THE CORE CRM

Kanban board. 6 columns. This is where leads live. Tour is the destination.

**Columns:**

1. **New Lead** — SLA: Hype call within 2hr (countdown timer on card)
2. **Hype Called** — SLA: Intent classified in same session
3. **Intent Set** — Sub-badges on cards: Soft (grey) / Medium (yellow) / Hard (orange) / Confirmed (red)
4. **Tour Scheduled** — Shows tour type (Physical 🏠 / Virtual 📹 / Direct 🤝), date/time, assigned FO
5. **Tour Done** — TCM follow-up SLA: 2hr countdown
6. **Booking / Lost** — Green for booking, red for lost. Lost requires reason dropdown.

**Lead Card:**

- Lead name + source (Portal / Referral / Walk-in / Direct)
- Zone interested in (badge)
- Intent badge (color-coded)
- Last touch: "2hr ago · [Name]"
- Visit Packet: ✓ Sent / ✗ Not Sent (red if missing, blocks "Tour Scheduled" column drag unless sent)
- Tour type icon if scheduled
- SLA countdown timer (red when <30min)
- Quick actions: Call, Message, Move Stage, Assign, Log Note

**Logic:**

- Cannot drag to "Tour Scheduled" if Visit Packet not sent — shows blocking toast "Send Visit Packet first"
- Cannot drag to "Tour Done" without logging tour type and outcome
- Overdue SLAs auto-flag with red border + manager notification

**Top bar filters:** Zone | FO/TCM | Intent Level | Tour Type | SLA Status | Date Range

---

### 3. LEAD FEED (`/lead-feed`)

Chronological activity stream. Think Slack but for lead actions.

Each event shows:

- Action type icon (call, tour, booking, note, packet, intent change)
- Actor name + role badge
- Lead name (clickable → opens lead detail)
- Action description: "Riya (FO) scheduled a Physical Tour for Priya Sharma · Koramangala Zone"
- Timestamp + "X min ago"
- Zero Latency badge if response was within 2hr (cyan ⚡)
- SLA breach flag if overdue (red ⚠)

Filters: By zone, by action type, by person, by date

---

### 4. HYPE CALL LOG (`/hype-calls`)

Table + analytics for all Hype calls.

**Table columns:** Lead Name | Assigned FO | Time Assigned | Call Made At | Time-to-Call | Outcome (Scheduled / Ghosted / Rescheduled / No Answer) | Intent Set? | Next Step

**Top metrics bar:**

- Avg time-to-call today
- % called within 2hr (Zero Latency Score)
- Calls resulting in tour scheduled

**Charts:**

- Bar chart: calls by hour of day (find peak)
- Pie chart: outcomes breakdown
- Line: Zero Latency score trend over 7 days

**Log new call button** → modal with: lead select, time, outcome, intent level set, next step

---

### 5. VISIT PACKET TRACKER (`/visit-packets`)

Mission: ensure every lead gets a Visit Packet before their tour.

**Status table:**

- Lead | Zone | FO Assigned | Tour Scheduled Date | Packet Sent? | Sent At | Sent By | Time Before Tour

**Red rows** = tour scheduled but packet not sent **Auto-reminder logic:** if tour is in <4hr and packet not sent → push notification to FO + manager

**Summary widget:** "X of Y tours today have Visit Packets sent" — big donut chart

---

### 6. ZONE DASHBOARD (`/zones`)

Manager/CEO view. Per-zone live tour operations.

Zone cards (one per zone):

- Zone name + city area
- Tours Target Today (set by FM)
- Tours Scheduled: [count] / [target] progress bar
- Tours Completed: [count] animated
- Conversion Rate: Scheduled → Done %
- Leads in pipeline: count by stage
- Assigned FOs (avatars) + their Zero Latency status (green/red dot)
- Assigned TCMs (avatars) + their follow-up compliance
- RevPAB today vs target (for FM/CEO only)

Click zone → zone detail view with full pipeline for that zone only

---

### 7. FLOOR PRICE GUARD (`/floor-price`)

Any booking attempted below zone floor price triggers a flag.

**Active flags table:** Lead | Zone | Asking Price | Floor Price | Discount Requested | TCM | Reason | Status (Pending / Approved / Rejected)

**Approval action:** FM/CEO can approve with note or reject. TCM notified instantly.

**Stats:** % of bookings attempted below floor | Avg discount requested | Most common reason

---

### 8. ARENA LEADERBOARD (`/leaderboard`)

The competitive core. Four tabs:

**Tab 1: Tours** — Ranked by tours scheduled + completed this week **Tab 2: XP** — Total XP this season **Tab 3: GHARp** — Coin earnings **Tab 4: Bookings** — Revenue contribution (FM/CEO only)

Each row: Rank (with delta vs yesterday), Avatar, Name, Role badge, Zone badge, Primary metric (large), Secondary metric (small), Level badge, Streak icon if active

Top 3 get gold/silver/bronze row highlight + animated crown/medal icon

Filter: This Week / This Month / This Season | All Zones / Zone Select | All Roles / Role Select

---

### 9. XP ENGINE (`src/lib/xp-engine.ts`)

```typescript
// XP Events — Tour First
export const XP_EVENTS = {
  // Flow Ops
  HYPE_CALL_ON_TIME: 50,        // within 2hr of assignment
  INTENT_CLASSIFIED: 20,         // in same call
  VISIT_PACKET_SENT: 30,         // within 1hr of intent set
  TOUR_SCHEDULED: 60,            // any type
  DIRECT_BOOKING_ASSISTED: 80,
  ZERO_LATENCY_DAY: 100,         // all leads touched within 2hr
  TWO_HOUR_PULSE: 25,
  // TCM
  INTENT_UPGRADED: 50,           // per stage
  TOUR_DONE_LOGGED: 40,
  BOOKING_CLOSED: 200,
  DIRECT_BOOKING_CLOSED: 250,
  FLOOR_PRICE_HELD: 30,
  REVPAB_ABOVE_TARGET: 100,
  TOUR_FOLLOWUP_ON_TIME: 35,
  EOD_REPORT_SHIPPED: 20,
  REFERRAL_TO_TOUR: 80,
  REFERRAL_TO_BOOKING: 150,
  // Shared
  PERFECT_ATTENDANCE: 15,
  CADENCE_ALL_BLOCKS: 40,
  KUDO_GIVEN: 10,
  KUDO_RECEIVED: 25,
  WEEKLY_TOUR_TARGET: 300,
  DAILY_TOUR_TARGET: 80,
};

// Levels
export const LEVELS = [
  { min: 1, max: 10, title: 'Rookie' },
  { min: 11, max: 25, title: 'Operator' },
  { min: 26, max: 40, title: 'Closer' },
  { min: 41, max: 60, title: 'Lead' },
  { min: 61, max: 80, title: 'Captain' },
  { min: 81, max: 100, title: 'Legend' },
];

```

Streaks:

- Daily streak: consecutive days with at least 1 tour-related XP event
- Weekly streak: consecutive weeks hitting tour target
- "Perfect Day": all 4 cadence blocks + daily tour target + EOD report

---

### 10. QUEST SYSTEM (`src/lib/quests.ts`)

Daily quests auto-assigned by role. Stored in localStorage. Reset at midnight.

```typescript
export const DAILY_QUESTS: Record<Role, Quest[]> = {
  FO: [
    { id: 'fo-hype-before-noon', title: '3 Hype Calls Before 12 PM', xp: 100, coins: 50, target: 3, metric: 'hype_calls_before_noon' },
    { id: 'fo-zero-latency', title: 'Zero Latency: All Leads Touched <2hr', xp: 120, coins: 60, target: 1, metric: 'zero_latency_day' },
    { id: 'fo-packets-sent', title: 'Send Visit Packet for All Today\'s Tours', xp: 80, coins: 40, target: 'dynamic', metric: 'packets_for_todays_tours' },
    { id: 'fo-schedule-2', title: 'Schedule 2 Tours Before 3 PM', xp: 150, coins: 80, target: 2, metric: 'tours_scheduled_before_3pm' },
    { id: 'fo-intent-logged', title: 'Log All Leads With Intent Before EOD', xp: 60, coins: 30, target: 'dynamic', metric: 'leads_with_intent_logged' },
  ],
  TCM: [
    { id: 'tcm-intent-upgrade', title: 'Move 2 Leads to Hard Intent', xp: 100, coins: 50, target: 2, metric: 'intent_upgrades_to_hard' },
    { id: 'tcm-followup', title: 'Follow Up Within 2hr on All Tours Done', xp: 120, coins: 60, target: 'dynamic', metric: 'tour_followups_on_time' },
    { id: 'tcm-booking', title: 'Close 1 Booking', xp: 200, coins: 200, target: 1, metric: 'bookings_closed' },
    { id: 'tcm-floor-price', title: 'Hold Floor Price All Day', xp: 80, coins: 40, target: 1, metric: 'floor_price_held_day' },
    { id: 'tcm-eod', title: 'Ship EOD Report by 8 PM', xp: 60, coins: 30, target: 1, metric: 'eod_shipped' },
  ],
};

export const WEEKLY_QUESTS: Quest[] = [
  { id: 'wk-tour-target-5days', title: 'Hit Zone Tour Target 5/5 Days', xp: 500, coins: 500, target: 5, metric: 'days_tour_target_hit' },
  { id: 'wk-zero-missed', title: 'Zero Missed Hype Calls All Week (FO) / Zero Missed Follow-ups (TCM)', xp: 400, coins: 400, target: 5, metric: 'zero_miss_days' },
  { id: 'wk-no-cold-lead', title: 'No Lead Untouched >24hr All Week', xp: 350, coins: 350, target: 5, metric: 'zero_cold_lead_days' },
];

```

---

### 11. REWARD SHOP (`/shop`)

Grid of perk cards. Each card: perk name, description, GHARp cost, availability (daily limit), "Redeem" button.

Redemption flow:

1. Click Redeem → confirmation modal with GHARp balance shown
2. Confirm → deducts GHARp, sends request to manager if approval needed
3. Manager gets inbox item, approves/rejects with note
4. User gets toast notification

Categories: Time Perks | Food | Recognition | Work Flexibility | Arena Themes

---

### 12. SKILL TREE (`/growth`)

Two tracks: TCM Track + FO Track. Visual tree with nodes.

**FO Track nodes:**

- Zero Latency Pro (proof: 5 consecutive Zero Latency days)
- Visit Packet Master (proof: 30 packets sent, 0 tours without packet)
- Hype Call Champion (proof: 100 hype calls logged)
- Tour Scheduler Elite (proof: 50 tours scheduled)
- Intent Classifier (proof: 80% accuracy on intent → outcome)
- Senior Flow Ops (unlocks at Level 40 + 3 weekly targets)

**TCM Track nodes:**

- Closer (proof: 10 bookings closed)
- Floor Price Defender (proof: 0 floor price violations in 30 days)
- Intent Mover (proof: 50 intent upgrades)
- RevPAB Champion (proof: above target 10 consecutive days)
- Referral Machine (proof: 5 referral conversions)
- Senior TCM (unlocks at Level 40 + 3 weekly targets)

Each node: locked (grey) / in progress (amber) / unlocked (gold + glow). Click unlocked node → claim badge + XP reward.

---

### 13. ACHIEVEMENTS (`/achievements`)

60+ badge grid. Categories:

**Tour Master:** First Tour, 10 Tours, 50 Tours, 100 Tours, Virtual Tour Pro, Physical Tour Pro **Speed:** Zero Latency Day, Zero Latency Week, 2hr Hype Call x10, Sub-1hr Packet x20 **Consistency:** 7-Day Streak, 30-Day Streak, Perfect Week, Perfect Month **Closer:** First Booking, Floor Price Defender, RevPAB King/Queen, Referral Converter **Team Player:** First Kudo Given, 10 Kudos Given, Kudo Magnet (25 received), Boss Battle MVP **Growth:** First Level Up, Hit Operator, Hit Closer, Hit Lead, Hit Captain, Hit Legend

Each badge: icon, name, description, earned date or "locked" state, XP awarded on earn

---

### 14. ATTENDANCE (`/attendance`)

- **Daily Check-In Card**: selfie-style check-in button (just a button for now), geo-zone confirmation
- **Monthly Heatmap**: GitHub-style contribution heatmap, color = on-time / late / absent
- **Streak Badge**: consecutive on-time days
- **Late Recovery Quest**: if late, auto-assigns a "make it up" quest for +50 XP if you complete 3 extra tour actions
- **First In / Last Out** badge for earliest check-in of the day
- **Stats**: On-time %, Late count, Absent count this month

---

### 15. TASKS (`/tasks`)

- Sprint Board (Kanban: Backlog / This Week / In Progress / Done)
- Task card: title, assignee, due date, priority badge, linked lead (if tour-related), WIP limit (max 3 in progress)
- Pomodoro link: starting a task starts the cadence timer with task as active label
- Recurring task templates
- Auto-XP on close (+20 XP per task, +50 if closed before due date)
- Blocker ping: mark task as blocked → notify manager + War Room

---

### 16. KUDOS (`/kudos`)

- **Public Wall of Fame**: scrolling card feed of recent kudos
- **Give Kudo**: select teammate, choose category (Tour Legend, Speed Demon, Team Player, Problem Solver, Mentor), write 1-line message
- **Kudo Token Budget**: each person gets 5 tokens/week to give. Resets Monday.
- **Kudo → XP**: giver gets +10 XP, receiver gets +25 XP + 20 GHARp
- **Top Kudos This Week**: mini leaderboard widget
- **Anonymous option toggle**

---

### 17. SCORE (`/score`)

Personal performance dashboard.

- **Radar Chart** (6 axes): Tour Velocity | Zero Latency | Quest Completion | XP Growth | Booking Rate | Attendance
- **Level Progress**: big XP bar, current level badge, XP to next level
- **Peer Compare**: how you rank vs your zone peers on each axis (percentile bar)
- **Next Level Needs coaching card**: "You need 3 more on-time tour follow-ups this week to hit Closer"
- **7-day trend charts** for each axis
- **Achievement showcase**: 3 pinned badges

---

### 18. 1:1s (`/one-on-ones`)

- Upcoming 1:1 cards with countdown
- Auto-agenda generated from: last week's blockers, open action items, current quest status
- During meeting: agenda checklist, note taker, action item creator
- Sentiment trend chart: after each 1:1, rate mood (1–5)
- Action item carryover: uncompleted items auto-appear in next 1:1
- Skip warning: skipping 2 consecutive 1:1s → manager notification

---

### 19. RECRUITING (`/recruiting`)

Tour-ops specific hiring pipeline.

- Roles: FO Trainee, TCM, Senior FO, Senior TCM, FM
- Pipeline: Applied → Screened → Interview → Trial Day → Offer → Joined
- SLA timers per stage
- Structured interview scorecard (Attitude, Sales Aptitude, Domain Knowledge, Energy Level)
- Trial Day result: "Scheduled their first tour within 3 days?" → key hiring signal
- Offer letter generator (template-based)

---

### 20. WELLNESS (`/wellness`)

- **Daily Mood Check-In**: 5-point emoji scale (shown once/day)
- **Hydration Nudge**: every 90min during work blocks
- **Burnout Radar** (FM/CEO view): grid of team members, color-coded:
  - Green: XP trending up + good attendance + positive mood
  - Yellow: any two metrics dipping
  - Red: all three metrics low → auto-flag for 1:1

---

### 21. WAR ROOM (`/war-room`)

- Live ticker: scrolling feed of real-time wins (tour scheduled, booking closed, intent upgraded)
- Raise Hand: flag an issue or ask for help → appears in manager's inbox
- Pinned Wins: FM/CEO can pin a win to the top of the room
- Daily Standup Auto-Room: 9 AM auto-prompt for 60s tap-through (what I did / will do / blocker)
- Mute-by-default: ticker muted until you unmute

---

### 22. CONSOLE (`/console`)

Role-specific AI briefing panel.

- **Morning Briefing**: shows at login: "Good morning [Name]. You have 4 active leads. 2 tours scheduled today. 1 hype call overdue. Your Zero Latency score yesterday was 92%."
- **EOD Auto-Draft**: button to generate EOD report from the day's actions
- **Hard Decision Log**: text area → CEO inbox
- **Power Hour Banner**: 11 AM–12 PM → banner flashes "⚡ POWER HOUR — 2× XP NOW" with active task prompt

---

### 23. GOALS & OKRs (`/goals`)

Three levels: Company → Zone → Personal

Each OKR:

- Objective text
- Key Results (3 max) with progress bar + confidence score (1–5 stars)
- Weekly check-in prompt
- Status: On Track / At Risk / Off Track

Personal OKRs cascade from Zone OKRs. FM sets zone targets. CEO sets company targets.

---

### 24. LEARNING HUB (`/learn`)

- Micro-course cards: title, duration (5–15 min), category, XP reward
- Course categories: Zero Latency Mastery | Intent Classification | Visit Packet Best Practice | Floor Price Defense | Booking Close Techniques
- Weekly drill: 5-question quiz, +50 XP for full marks
- Completion certificates (badge + PDF download)
- INTERN role sees mandatory onboarding track as first view

---

### 25. TOWN HALL (`/town-hall`)

- **Broadcasts**: rich-text announcements from CEO/FM. Pinned at top.
- **Polls**: create a poll, vote, see results in real-time bar chart
- **AMA Queue**: submit questions, CEO/FM answers, archived by date
- **All-Hands Recordings**: link list with date, topic, duration

---

### 26. INBOX (`/inbox`)

Unified feed. Everything in one place.

Tabs: All | Approvals | Mentions | Kudos | Quest Updates | SLA Alerts

Each item: icon, from, description, timestamp, action button (Approve/Reject/View/Dismiss)

SLA alerts auto-appear for: lead >2hr untouched, tour without packet, missed hype call, floor price flag, leave pending approval

Bulk actions: Mark all read, Dismiss all alerts

---

### 27. CALENDAR (`/calendar`)

Views: Day / Week / Month

Events: Tours (physical/virtual color-coded), 1:1s, All-Hands, Standup Conflict detection: red border if overlap Focus Time Blocks: FO/TCM can block time for cadence sessions Team Availability Stack: see who's available for a zone at what time Quiet Hours: no notifications 9–10 AM (standup block)

---

### 28. PEOPLE / ROSTER (`/people`)

- Org chart with zone depth
- Skill tags per person (searchable)
- "Who Can Help" quick-match: select skill → see who has it and is available
- Birthdays + Work Anniversaries strip at top
- Click person → mini-profile: role, zone, level, current streak, recent kudos received, active quests

---

### 29. SETTINGS (`/settings`)

- Confetti toggle
- Sound toggle (booking/tour close chime)
- Theme selector (unlocked themes appear here)
- Notification preferences
- Cadence timer preferences (work block duration)
- Role preview (for demo/testing: switch roles to see different views)

---

### 30. GAME LAYER

**Power Hour:** Every day 11:00 AM – 12:00 PM, a banner activates across all pages: "⚡ POWER HOUR ACTIVE — All XP 2×". All XP events during this hour grant double XP. Countdown timer in banner.

**Boss Battle:** Quarterly. Zone vs Zone. Most tours scheduled + completed in 90 days wins. Visible progress bar on leaderboard page. Winner: 3000 GHARp per team member + trophy badge + Founder Shoutout perk.

**Seasons:** Every 3 months. Leaderboard resets. All-time records preserved. Seasonal badge awarded to top 3 in XP, Tours, GHARp.

**Daily Login Streak:** Day 1: 20 GHARp. Day 3: 50 GHARp. Day 7: 150 GHARp + badge. Day 30: 500 GHARp + "Dedicated" badge.

**Confetti burst:** triggers on: tour scheduled, tour completed, booking closed, quest completed, level up. Full-screen confetti for 2 seconds. Can be toggled off in settings.

**Theme Unlocks:** Base theme (dark arena). Unlockable: Neon (Level 25), Retro Terminal (Level 50), Gold Arena (Level 75), Legend Black (Level 100). All purchased via GHARp in shop.

---

## MOCK DATA

Seed the app with realistic demo data:

**Zones:** Koramangala, Indiranagar, HSR Layout, Whitefield, Marathahalli, Bellandur

**Sample users:**

- Riya (FO, Level 18 Operator, Koramangala, 7-day streak)
- Arjun (TCM, Level 34 Closer, HSR Layout, 3-day streak)
- Priya (FM, Level 52 Lead, all zones)
- Karan (FO, Level 8 Rookie, Indiranagar)
- Meera (TCM, Level 45 Lead, Whitefield)

**Sample leads:** 10–15 leads spread across all pipeline stages, zones, and intent levels

**Sample activity:** Last 48hr of lead feed events, 3 floor price flags (2 pending, 1 approved), 5 completed tours this week, 2 bookings

**Leaderboard:** Seed with the sample users + 5 more names with varied XP/tour counts

---

## NAVIGATION SIDEBAR

Two-tier sidebar. Collapsible to icons.

**Tier 1 (Core — always visible):**

- 🏠 Tour Command Center
- 📊 Intent Pipeline
- 📋 Lead Feed
- 📞 Hype Calls
- 📦 Visit Packets
- 🗺 Zone Dashboard
- 🚨 Floor Price Guard

**Tier 2 (Performance):**

- 🏆 Leaderboard
- 🎯 Quests
- 🏅 Achievements
- 💰 Reward Shop
- 🌱 Skill Tree
- ⭐ My Score

**Tier 3 (Team):**

- 👥 People
- 📅 Calendar
- ✉️ Inbox (badge count)
- 💬 War Room
- 🌟 Kudos
- 🤝 1:1s

**Tier 4 (Ops):**

- ✅ Tasks
- 🏖 Leaves
- 💼 Recruiting
- 🎯 Goals
- 📚 Learning Hub
- 💆 Wellness
- 📣 Town Hall
- 🖥 Console

**Bottom of sidebar:** XP bar (always visible), Level badge, GHARp balance, user avatar + name + role badge

---

## FLOATING ELEMENTS (always rendered)

1. **90/10/10 Cadence Timer** — bottom-right corner, floating card
2. **Level-Up Toast** — top-center, slides in when level up triggers
3. **XP Gain Toast** — bottom-left, small pill "+50 XP · Tour Scheduled" fades in/out
4. **Power Hour Banner** — top of screen, amber animated bar (11 AM–12 PM)
5. **Confetti** — full-screen canvas layer on win events

---

## PERMISSIONS MATRIX

```typescript
const PERMISSIONS = {
  TCM: ['pipeline', 'lead-feed', 'hype-calls', 'visit-packets', 'leaderboard', 'quests', 'achievements', 'shop', 'growth', 'score', 'attendance', 'tasks', 'leaves', 'kudos', 'one-on-ones', 'calendar', 'inbox', 'war-room', 'people', 'goals', 'wellness', 'learn', 'town-hall', 'console'],
  FO: ['pipeline', 'lead-feed', 'hype-calls', 'visit-packets', 'leaderboard', 'quests', 'achievements', 'shop', 'growth', 'score', 'attendance', 'tasks', 'leaves', 'kudos', 'one-on-ones', 'calendar', 'inbox', 'war-room', 'people', 'goals', 'wellness', 'learn', 'town-hall', 'console'],
  FM: ['*', '-compensation'], // all except compensation
  CEO: ['*'], // everything
  TRAINER: ['learn', 'people', 'one-on-ones', 'quests', 'goals'],
  INTERN: ['pipeline-readonly', 'learn', 'attendance', 'kudos', 'wellness', 'quests'],
};

```

---

## IMPLEMENTATION NOTES

1. Use `makeStore` for ALL state. No prop drilling. Each module gets its own store slice.
2. All routes use React Router `<Outlet>` with a shared `AppShell` (sidebar + floating elements)
3. Charts use Recharts. Animate on mount with `animationBegin={0}` and `animationDuration={800}`
4. All number counters animate with a counting-up effect on mount
5. SLA timers: use real-time countdown, re-render every second using `setInterval` in `useEffect`
6. Mobile: sidebar collapses to bottom tab bar on <768px. Tour Pulse becomes the home card. Intent Pipeline becomes a swipeable column view.
7. Empty states: every list/table has a themed empty state with a CTA ("Schedule your first tour →")
8. Loading skeletons: every data-fetching view shows skeleton cards while loading
9. `head()` SEO meta on every route

Build the entire system described above. Every route. Every module. Every game mechanic. This is the complete spec — execute it fully and ship a working, beautiful, dark-themed arena that makes every GharPayy team member want to log in every morning and convert every lead into a tour.

---

*GharPayy Arena — Built for the team that turns rooms into revenue.*