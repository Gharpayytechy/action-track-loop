// Role playbooks — operationalized from the 4 leadership SOPs.
// Each playbook drives the /console screen: sprints, KPIs, comm windows, EOD.

export type PlaybookKey =
  | "communication_shield"
  | "performance_enforcer"
  | "training_architect"
  | "talent_engine"
  | "pod_command"
  | "tour_conductor"
  | "lead_router"
  | "people_pulse"
  | "operator_day";

export interface KpiTarget {
  id: string;
  label: string;
  target: number;
  unit?: string;
  // "count" = increment counter; "boolean" = done/not; "percent" = 0-100
  kind: "count" | "boolean" | "percent";
  why: string; // 1-line "why this matters"
}

export interface SprintBlock {
  id: string;
  index: number;
  name: string;
  startMin: number; // minutes from midnight
  endMin: number;
  objective: string;
  actions: { time: string; do: string; output: string }[];
  metric: string;
  shielded?: boolean; // shield mode applies during this block
}

export interface CommWindow {
  id: string;
  label: string;
  atMin: number; // minutes from midnight
  channel: "WhatsApp Group" | "WhatsApp 1:1" | "Floor" | "Internal";
  template: string; // mustache-ish, with {{placeholders}}
}

export interface EodField {
  id: string;
  label: string;
  kind: "number" | "text" | "yesno" | "list";
  placeholder?: string;
}

export interface RolePlaybook {
  key: PlaybookKey;
  title: string;
  subtitle: string;
  oneLiner: string;
  interdependence: string;
  collapseRule: string;
  kpis: KpiTarget[];
  sprints: SprintBlock[];
  commWindows: CommWindow[];
  eodFields: EodField[];
  shieldBlocks: { startMin: number; endMin: number; label: string }[];
  // Mapped to seed Employee.id — who owns this playbook by default
  ownerId: string;
  accent: string; // tailwind hue tag
}

const t = (h: number, m = 0) => h * 60 + m;

// =================== NITHYA — COMMUNICATION SHIELD ===================
const NITHYA: RolePlaybook = {
  key: "communication_shield",
  title: "Communication Shield",
  subtitle: "In-Office Command · Precision Communication",
  oneLiner:
    "You run the in-office engine and control Gharpayy's entire communication rhythm. Every hour counts, every message lands.",
  interdependence:
    "If Nithya fails → office discipline collapses → Sneha has no floor data → Jiya's trainees enter chaos.",
  collapseRule:
    "If in-office call volume < 50% of daily target by 1:00 PM, OR any employee unreachable for 2+ hours → alert Sneha at the 1:00 PM window.",
  ownerId: "e12",
  accent: "primary",
  kpis: [
    { id: "ontime", label: "On-time at desk by 10:30", target: 100, unit: "%", kind: "percent", why: "A late start is a lost morning sprint." },
    { id: "conn", label: "Avg connections / person", target: 70, kind: "count", why: "Below 70, the funnel collapses by EOD." },
    { id: "ghost", label: "Ghost leads cleared", target: 1, kind: "boolean", why: "Zero leads without a next-step task." },
    { id: "stuck", label: "Stuck WhatsApp chats >24h", target: 0, kind: "count", why: "Silence kills trust. Move every chat." },
    { id: "revived", label: "Revived leads (7-day sweep)", target: 20, kind: "count", why: "Yesterday's silence is today's revenue." },
    { id: "audited", label: "Lead journeys audited", target: 30, kind: "count", why: "Movement, not chatting. Tour-bound or out." },
    { id: "corrections", label: "Real-time corrections", target: 5, kind: "count", why: "Fix the pitch on the call, not at debrief." },
    { id: "windows", label: "Comm windows sent on time", target: 4, kind: "count", why: "4 windows. Not 5. Not 3. Exactly 4." },
    { id: "scored", label: "Every employee scored A/B/C", target: 1, kind: "boolean", why: "Public scoreboard or no scoreboard." },
    { id: "c_player_1on1", label: "C-player 1:1s done by 7 PM", target: 1, kind: "boolean", why: "C-players don't go home without a plan." },
  ],
  shieldBlocks: [
    { startMin: t(10, 40), endMin: t(13, 0), label: "Sprint Block · No group msgs" },
    { startMin: t(14, 0), endMin: t(17, 0), label: "Sprint Block · No group msgs" },
  ],
  sprints: [
    {
      id: "n_s1", index: 1, name: "Floor Ignition + CRM Audit",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Start sharp. Every target spoken. CRM clean before Sprint 2.",
      actions: [
        { time: "10:25", do: "Setup attendance, perf tracker, CRM open", output: "Systems ready" },
        { time: "10:30", do: "Stand-up — every person states their target out loud", output: "Targets spoken" },
        { time: "10:40", do: "Lock attendance. Shield Mode begins", output: "Group msg sent at 10:40" },
        { time: "10:45–11:30", do: "CRM Audit Round 1 — assign next-step task to every ghost lead", output: "Zero ghost leads" },
        { time: "11:30–12:00", do: "Floor monitoring — catch 3 early blockers", output: "3 blockers resolved" },
      ],
      metric: "100% CRM task alignment. 70+ acknowledged. Ghost leads cleared.",
    },
    {
      id: "n_s2", index: 2, name: "WhatsApp + 7-Day Lead Sweep",
      startMin: t(12, 0), endMin: t(13, 0),
      objective: "No chat stuck >7 days. 20 leads revived.",
      actions: [
        { time: "12:00–12:30", do: "Sweep WhatsApp — every chat older than 24h gets a move", output: "Backlog cleared" },
        { time: "12:30–1:00", do: "7-day sweep — revive 20 leads with new pitch", output: "20 revived" },
      ],
      metric: "Zero chats stuck >7 days. 20 leads revived.",
    },
    {
      id: "n_s3", index: 3, name: "Lead Journey Audit + Real-Time Corrections",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Leads must be moving toward a tour, not in circles.",
      actions: [
        { time: "2:30–3:30", do: "Audit 30 lead journeys — flag the ones going in circles", output: "30 journeys verified" },
        { time: "3:30–4:00", do: "5 real-time corrections — intervene on the live call", output: "5 corrections done" },
      ],
      metric: "30 journeys verified. 5 real-time corrections.",
      shielded: true,
    },
    {
      id: "n_s4", index: 4, name: "70-Connection Enforcement",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "No one ends below 70. Lagging employees get a protected sprint.",
      actions: [
        { time: "4:00–4:30", do: "Audit who's below 50 — give them a 30-min uninterrupted block", output: "Lagging in protected sprint" },
        { time: "4:30–5:00", do: "Push the floor — public count visible", output: "Count visible to all" },
      ],
      metric: "Every person on track for 70+ by 7 PM.",
    },
    {
      id: "n_s5", index: 5, name: "Final Push + Scorecards",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Public scoreboard. C-player 1:1 before 7 PM.",
      actions: [
        { time: "5:20–6:30", do: "Post scoreboard. C-player 1:1 mandatory", output: "Scoreboard posted, 1:1 done" },
        { time: "6:30–7:30", do: "Action plans signed. EOD prep", output: "Plans signed" },
      ],
      metric: "All scored. All C-players have a written plan for tomorrow.",
    },
  ],
  commWindows: [
    {
      id: "n_w1", label: "Morning Ignition", atMin: t(10, 30), channel: "WhatsApp Group",
      template: `🌅 Good morning, Gharpayy!
Today's targets:
📞 Connections per person: 70+
🏠 Tours to support: 10 (Flow Ops)
💬 WhatsApp chats actioned: All of them
⏰ Everyone at desk. Targets spoken. Let's start.
Next update: 1:00 PM. 💪`,
    },
    {
      id: "n_w2", label: "Mid-Day Pulse", atMin: t(13, 0), channel: "WhatsApp Group",
      template: `📊 1 PM — Numbers before break:
Connections avg: {{avg}}
Tours booked: {{tours}}
Chats stuck >24h: {{stuck}} — must be zero by 5 PM
On track: {{on_track}}
Needs push: {{needs_push}}
Break: 1:15–2:00. Back at 2:00 sharp. 🍽️`,
    },
    {
      id: "n_w3", label: "Pre-Snack Push", atMin: t(17, 0), channel: "WhatsApp Group",
      template: `🔥 5 PM check-in:
Connections avg: {{avg}} (need 70+)
Tours today: {{tours}}/10
Revived leads: {{revived}}/20
Strong finish: {{strong}}
Final sprint needed: {{final}}
Snack: 5:00–5:20. 5:20 — final push. No drift. 💪`,
    },
    {
      id: "n_w4", label: "EOD Report", atMin: t(19, 30), channel: "WhatsApp Group",
      template: `🌙 EOD — {{date}}
Connections avg: {{avg}}/70
Tours done: {{tours}}/10
Stuck chats: {{stuck}}
Revived: {{revived}}/20
A: {{a}} | B: {{b}} | C: {{c}}
Hard decision today: {{hard}}`,
    },
  ],
  eodFields: [
    { id: "avg_conn", label: "Avg connections / person", kind: "number" },
    { id: "tours", label: "Tours from floor", kind: "number" },
    { id: "stuck", label: "Stuck chats remaining", kind: "number" },
    { id: "revived", label: "Leads revived", kind: "number" },
    { id: "a", label: "A players (names)", kind: "list" },
    { id: "b", label: "B players (names)", kind: "list" },
    { id: "c", label: "C players (names)", kind: "list" },
    { id: "ghost_clean", label: "CRM clean — zero ghost leads?", kind: "yesno" },
    { id: "windows_on_time", label: "All 4 windows sent on time?", kind: "yesno" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Formal warning to X for second late entry." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

// =================== SNEHA — PERFORMANCE ENFORCER ===================
const SNEHA_PE: RolePlaybook = {
  key: "performance_enforcer",
  title: "Performance Enforcer",
  subtitle: "Tours + Closings Command · The 10:16:60 Standard",
  oneLiner:
    "Ensure the revenue engine never stops. 10 tours/day. 60% show-up. 2 closings/TCM after 6 tours.",
  interdependence:
    "If Sneha fails → tours don't happen → closings don't happen → Gharpayy makes no money.",
  collapseRule:
    "If tours < 10 by 5:00 PM, OR show-up % < 60 weekly → alert Nithya & Divyanshu at the 5:00 PM window.",
  ownerId: "e13",
  accent: "destructive",
  kpis: [
    { id: "booked", label: "Tours booked", target: 16, kind: "count", why: "16 to guarantee 10 done at 60% show-up." },
    { id: "done", label: "Tours completed", target: 10, kind: "count", why: "10 is the floor. Below 10 = no revenue day." },
    { id: "showup", label: "Show-up % this week", target: 60, unit: "%", kind: "percent", why: "Below 60% = pitch or confirmation broken." },
    { id: "closings", label: "TCM closings (after 6 tours)", target: 2, kind: "count", why: "6 tours and no close = the ask was missed." },
    { id: "noshows", label: "No-shows analyzed", target: 100, unit: "%", kind: "percent", why: "Every no-show has a named reason. No exceptions." },
    { id: "pitch_fix", label: "Pitch corrections sent", target: 5, kind: "count", why: "Specific quote → specific fix → next call." },
    { id: "tomorrow", label: "Tomorrow's morning tours confirmed", target: 100, unit: "%", kind: "percent", why: "Confirmed today, or it's already broken." },
    { id: "ooo", label: "OOO team connected", target: 100, unit: "%", kind: "percent", why: "Silence in the morning = drift all day." },
    { id: "calls_listened", label: "Live calls listened-in", target: 8, kind: "count", why: "Coach in the moment, not at debrief." },
    { id: "red_zone_named", label: "Red-zone names published", target: 1, kind: "boolean", why: "If the floor doesn't see it, it isn't real." },
    { id: "tcm_six_rule", label: "TCMs hitting 6-tour rule", target: 100, unit: "%", kind: "percent", why: "Below 6 = the ask was never made." },
    { id: "evening_ranking", label: "Evening ranking posted", target: 1, kind: "boolean", why: "Public leaderboard at 6 PM. No exceptions." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "s_s1", index: 1, name: "Show-Up Drill + OOO Connect",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Start the day knowing where yesterday broke and whether today can deliver 10 tours.",
      actions: [
        { time: "10:25", do: "Open Callyzer, Superfone, OOO group", output: "Systems live" },
        { time: "10:30–10:45", do: "OOO connect — 2-min check per person", output: "Everyone confirmed" },
        { time: "10:45–11:30", do: "Audit yesterday's show-up data — name root cause", output: "No-show analysis done" },
        { time: "11:30–12:00", do: "Correction calls to Flow Ops below 60%", output: "Specific fixes given" },
      ],
      metric: "60%+ show-up enforced. Zero un-analyzed no-shows. 100% OOO connected.",
    },
    {
      id: "s_s2", index: 2, name: "TCM Closing Audit",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "Did 6-tour-to-2-closing rule hit? If not, find the exact missed ask.",
      actions: [
        { time: "12:00–12:30", do: "Pull call logs — verify 6 tours per TCM + ask made", output: "Logs reviewed" },
        { time: "12:30–1:15", do: "Listen to recordings of misses — name the moment", output: "Gap documented w/ timestamp" },
      ],
      metric: "2 closings tracked per TCM. Every miss has a named reason.",
    },
    {
      id: "s_s3", index: 3, name: "Performance Correction + Nithya Sync",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Intervene before the day runs out.",
      actions: [
        { time: "2:30–3:00", do: "Sync with Nithya — leads enough? comms blocking?", output: "Joint action agreed" },
        { time: "3:00–4:00", do: "Live correction — listen + intervene on 5 Flow Ops", output: "5 interventions done" },
      ],
      metric: "5 interventions. Nithya synced.",
    },
    {
      id: "s_s4", index: 4, name: "Tomorrow's Tour Guarantee",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "Every morning tour reconfirmed today.",
      actions: [
        { time: "4:00–4:45", do: "Call/WhatsApp every 10am-1pm tomorrow lead", output: "100% confirmed" },
        { time: "4:45–5:00", do: "Verify 16 bookings/Flow Op for tomorrow", output: "Gaps filled now" },
      ],
      metric: "Tomorrow's morning tours: 100% confirmed.",
    },
    {
      id: "s_s5", index: 5, name: "Evening OOO + Final Numbers",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Public ranking. Final count visible to all.",
      actions: [
        { time: "5:20–6:00", do: "Pulse check — red zone updated", output: "Red zone shared" },
        { time: "6:00–7:00", do: "Evening OOO meeting — public ranking", output: "Numbers visible" },
        { time: "7:00–7:30", do: "Performance gap report → EOD", output: "Numbers ready" },
      ],
      metric: "Final ranking shared. Gap report ready.",
    },
  ],
  commWindows: [
    {
      id: "s_w1", label: "Morning OOO Connect (1:1)", atMin: t(10, 30), channel: "WhatsApp 1:1",
      template: `Hey {{name}} 👋 Quick 2-min check.
What's your tour target today? Leads assigned? Any blockers? Reply now.`,
    },
    {
      id: "s_w2", label: "Morning Group Start", atMin: t(10, 45), channel: "WhatsApp Group",
      template: `✅ Morning team! Everyone connected.
🏠 Tours to book: 16 (to guarantee 10 done)
📍 Show-ups yesterday: {{yest_showup}}
💰 Closings expected: 2 per TCM (after 6 tours)
The number that matters: 10. Let's go. 🔑`,
    },
    {
      id: "s_w3", label: "Specific Feedback (1:1)", atMin: t(15, 0), channel: "WhatsApp 1:1",
      template: `Hey {{name}}, reviewed your {{time}} call.
When the customer said "{{quote}}", you responded with "{{response}}" — that's where they went cold.
Next time say: "{{better}}".
Try this in your next 3 calls. Tell me how it goes.`,
    },
    {
      id: "s_w4", label: "Evening Group Update", atMin: t(18, 0), channel: "WhatsApp Group",
      template: `🌇 Evening update:
Tours completed: {{done}}/10
Show-up this week: {{showup}}%
🏆 Top performer: {{top}}
⚠️ Red zone: {{red}}
Tomorrow's morning tours: {{tomorrow}} confirmed
One fix for tomorrow: {{fix}}`,
    },
  ],
  eodFields: [
    { id: "ooo_connected", label: "OOO connected (X/total)", kind: "text" },
    { id: "booked", label: "Tours booked today", kind: "number" },
    { id: "done", label: "Tours completed", kind: "number" },
    { id: "showup", label: "Show-up % this week", kind: "number" },
    { id: "closings", label: "TCM closings today", kind: "number" },
    { id: "six_rule", label: "6-tour rule met?", kind: "yesno" },
    { id: "no_shows_root", label: "No-show root causes", kind: "list" },
    { id: "fixes_sent", label: "Pitch corrections sent", kind: "number" },
    { id: "tomorrow_confirmed", label: "Tomorrow morning tours confirmed (X/X)", kind: "text" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Final warning — 40% show-up 3 days." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

// =================== JIYA — TRAINING ARCHITECT ===================
const JIYA: RolePlaybook = {
  key: "training_architect",
  title: "Training Architect",
  subtitle: "From Raw Hire to Arena-Ready in 48 Hours",
  oneLiner:
    "Build operators who can generate tours, close leads, and represent Gharpayy with precision — within 48 hours.",
  interdependence:
    "If Jiya fails → Sneha's tours don't convert → Nithya's floor lacks discipline → Thanvi's hiring has zero ROI.",
  collapseRule:
    "If any trainee remains 'No-Go' past Day 3 → escalate to Divyanshu at the 5:00 PM window.",
  ownerId: "e14",
  accent: "warning",
  kpis: [
    { id: "day0", label: "Day 0 calls completed", target: 100, unit: "%", kind: "percent", why: "Day 1 starts the night before." },
    { id: "cleared", label: "Trainees cleared by Day 2", target: 70, unit: "%", kind: "percent", why: "≥70% or the batch is broken." },
    { id: "improvement", label: "Daily skill score improvement", target: 10, unit: "%", kind: "percent", why: "10% better every day. Measurable." },
    { id: "sims", label: "Simulations / trainee", target: 5, kind: "count", why: "5 sims per sprint. No passive watching." },
    { id: "support_speak", label: "Support Speak instances", target: 0, kind: "count", why: "Zero. Operators, not help desk." },
    { id: "go_no_go", label: "Go/No-Go report submitted", target: 1, kind: "boolean", why: "By 7:30 PM. No exceptions." },
    { id: "sop_updated", label: "SOPs updated (this week's errors)", target: 1, kind: "boolean", why: "Same week they're trained." },
    { id: "mock_calls", label: "Mock calls per trainee", target: 3, kind: "count", why: "3 mocks min — pen-and-paper score each." },
    { id: "agenda_check", label: "1:1 agenda checks done", target: 100, unit: "%", kind: "percent", why: "Every trainee, eye-to-eye, no skipping." },
    { id: "scripts_redist", label: "Corrected scripts redistributed", target: 1, kind: "boolean", why: "Mistake-of-day → fix → in everyone's hand." },
    { id: "module_forms", label: "Module forms collected", target: 100, unit: "%", kind: "percent", why: "No paperwork = no proof of training." },
    { id: "intent_score", label: "Avg intent score", target: 8, kind: "count", why: "Below 8/10 means we're training the wrong people." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "j_s1", index: 1, name: "Day 0 Alignment + The Why Agenda",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Every trainee knows why they're here, what's expected, what today achieves.",
      actions: [
        { time: "10:25", do: "Training dashboard open. Day plan shared", output: "Trainees see plan" },
        { time: "10:30–10:50", do: "Mission in 3 sentences. Each trainee speaks their why. Win-Win agenda", output: "Intent spoken aloud" },
        { time: "10:50–12:00", do: "Module 1: First call structure + property pitch. Every trainee 1 mock call", output: "Every trainee attempted" },
      ],
      metric: "100% Day 0 clarity. Every trainee attempted a call.",
    },
    {
      id: "j_s2", index: 2, name: "The 10% Improvement Drill",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "One mistake. Fix it 10% better. Not 5 things.",
      actions: [
        { time: "12:00–12:15", do: "Identify Mistake of the Day. Announce publicly", output: "Mistake named" },
        { time: "12:15–1:15", do: "90-min intensive drill on that one skill. Score before/after", output: "Score deltas documented" },
      ],
      metric: "10% increase on that specific skill, start to end of drill.",
    },
    {
      id: "j_s3", index: 3, name: "Simulation Lab — Kill Support Speak",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Operators, not help desk. Zero tolerance for customer-care language.",
      actions: [
        { time: "2:30–4:00", do: "5 simulations per trainee — scored. Forbidden words flagged live", output: "5 sims/trainee, zero support speak" },
      ],
      metric: "5 simulations per trainee. Zero support speak past this block.",
    },
    {
      id: "j_s4", index: 4, name: "Readiness Audit + Go/No-Go",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "Name-by-name readiness list by 5 PM.",
      actions: [
        { time: "4:00–4:45", do: "1:1 Agenda Check per trainee — can they take a live call now?", output: "Go/No-Go decision per person" },
        { time: "4:45–5:00", do: "Final report drafted. Escalation list prepared", output: "Report ready" },
      ],
      metric: "Go/No-Go per trainee. No 'maybe'.",
    },
    {
      id: "j_s5", index: 5, name: "Re-train + SOP Update",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Fix the No-Go gap, update SOPs with this week's real errors.",
      actions: [
        { time: "5:20–6:30", do: "Re-train No-Go on targeted gap only", output: "Corrected scripts redistributed" },
        { time: "6:30–7:30", do: "Update SOP. Collect module forms. Score final assessment", output: "SOPs updated" },
      ],
      metric: "SOPs reflect this week's reality.",
    },
  ],
  commWindows: [
    {
      id: "j_w1", label: "Day-Before Welcome", atMin: t(18, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 👋 This is Jiya from Gharpayy.
We're excited to have you join us tomorrow! Please be at the office by 10:25 AM.
Carry a pen and notepad — Day 1 is intensive and valuable. See you! 🏠`,
    },
    {
      id: "j_w2", label: "Day 1 Morning Plan", atMin: t(10, 50), channel: "WhatsApp 1:1",
      template: `Good morning {{name}}!
Here's your Day 1 plan: {{agenda}}.
Your goal today: complete 2 modules + attempt your first mock call. Let's make it count 💪`,
    },
    {
      id: "j_w3", label: "Post-Assessment (Pass)", atMin: t(17, 0), channel: "WhatsApp 1:1",
      template: `{{name}}, you've cleared the Day {{day}} assessment ✅
Score: {{score}}%. You're on track. Tomorrow we go deeper. Stay sharp!`,
    },
    {
      id: "j_w4", label: "Go/No-Go Cleared", atMin: t(18, 30), channel: "WhatsApp 1:1",
      template: `{{name}}, you've been cleared 🎯 for live leads starting {{date}}.
Trust the training, follow the script, and remember: you're making a conversation, not a customer-care call. You've got this! 🚀`,
    },
  ],
  eodFields: [
    { id: "trainees", label: "Trainees in session", kind: "number" },
    { id: "go", label: "Go (names)", kind: "list" },
    { id: "nogo", label: "No-Go (names + reason)", kind: "list" },
    { id: "day0_calls", label: "Day 0 calls completed (X/X)", kind: "text" },
    { id: "score_delta", label: "Sprint 2: before % → after %", kind: "text" },
    { id: "top_mistakes", label: "Top 3 mistakes today", kind: "list" },
    { id: "sims_done", label: "Avg simulations / trainee", kind: "number" },
    { id: "sop", label: "SOPs updated?", kind: "yesno" },
    { id: "support_speak", label: "Support speak instances", kind: "number" },
    { id: "escalated", label: "Escalated to Divyanshu", kind: "text" },
  ],
};

// =================== THANVI — TALENT ENGINE ===================
const THANVI: RolePlaybook = {
  key: "talent_engine",
  title: "Talent Engine",
  subtitle: "Hiring System · Long-Term Operators Only",
  oneLiner:
    "Source long-term, high-intent operators. One wrong hire wastes Jiya's training, Sneha's tours, the whole chain.",
  interdependence:
    "If Thanvi fails → Jiya has no one to train → Sneha has no floor team → Nithya has no one to manage.",
  collapseRule:
    "If interviews drop below 15 by 1:00 PM → alert Nithya at the 1:00 PM window.",
  ownerId: "e15",
  accent: "info",
  kpis: [
    { id: "interviews", label: "Interviews completed", target: 20, kind: "count", why: "20+ or the pipeline starves." },
    { id: "slots_locked", label: "Slots locked (today)", target: 30, kind: "count", why: "30 confirmed before 10:30." },
    { id: "junior_hr", label: "Junior HR contribution", target: 5, kind: "count", why: "Each junior HR = 5 minimum." },
    { id: "wa_response", label: "WhatsApp response rate", target: 100, unit: "%", kind: "percent", why: "Silence kills referrals. Zero unread." },
    { id: "reminders", label: "Internshala reminders sent", target: 30, kind: "count", why: "No slot unreminded." },
    { id: "referrals", label: "Referral leads contacted", target: 15, kind: "count", why: "Referrals come pre-vetted. Gold." },
    { id: "profiles", label: "New profiles sourced", target: 50, kind: "count", why: "Pipeline must be heavier at 4 PM than 10:30." },
    { id: "tomorrow_locked", label: "Tomorrow's pipeline locked", target: 30, kind: "count", why: "By 5:30 PM. No day starts unloaded." },
    { id: "intent_q_asked", label: "Intent questions asked / interview", target: 3, kind: "count", why: "3 minimum. Otherwise we hire need, not want." },
    { id: "ten_min_close", label: "Decisions sent within 10 min", target: 100, unit: "%", kind: "percent", why: "Yes/No/On-Hold while the call is warm." },
    { id: "ghost_rate", label: "Candidate ghost rate", target: 10, unit: "%", kind: "percent", why: "Above 10% = our reminders are weak." },
    { id: "junior_audit", label: "Junior HR logs audited", target: 100, unit: "%", kind: "percent", why: "Counts, quality, post-WhatsApps verified daily." },
    { id: "jiya_briefed", label: "Jiya briefed for tomorrow", target: 1, kind: "boolean", why: "She can't train someone she doesn't know is coming." },
  ],
  shieldBlocks: [],
  sprints: [
    {
      id: "th_s1", index: 1, name: "Pipeline Sweep + Reminders",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "No candidate shows up surprised. No one ghosts because they forgot.",
      actions: [
        { time: "10:25", do: "Login. Open Internshala, Calendly, Tracker, WhatsApp", output: "Systems live" },
        { time: "10:30–10:45", do: "Confirm 30 slots. Brief junior HRs — assign batches", output: "30 confirmed" },
        { time: "10:45–11:15", do: "Send reminders to all today's applicants. Clear WhatsApp", output: "30 reminders, zero backlog" },
        { time: "11:15–12:00", do: "Conduct 4 interviews. Decision in real time. WhatsApp within 10 min", output: "4 done, 4 messages sent" },
      ],
      metric: "100% WhatsApp response. 30 reminders. Pipeline confirmed.",
    },
    {
      id: "th_s2", index: 2, name: "Intent-First Interviews",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "Filter for people who want to be here, not who need a job.",
      actions: [
        { time: "12:00–1:15", do: "8 interviews. Ask 3 intent questions. Score in tracker within 5 min", output: "12 done by lunch, 8 logged" },
      ],
      metric: "Zero 'maybe'. Selected, Rejected, or On-Hold with reason.",
    },
    {
      id: "th_s3", index: 3, name: "Referral + Quality Sourcing",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Pipeline heavier at 4 PM than at 10:30 AM.",
      actions: [
        { time: "2:30–3:15", do: "Reach 15 referrals. Personal, specific, not copy-paste", output: "15 contacted" },
        { time: "3:15–4:00", do: "Source 50 new profiles on Internshala/LinkedIn", output: "50 added" },
      ],
      metric: "50 sourced. 15 referrals personally contacted.",
    },
    {
      id: "th_s4", index: 4, name: "Tomorrow's 30-Slot Lock",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "If 30 aren't confirmed by 5 PM, tomorrow is already broken.",
      actions: [
        { time: "4:00–4:45", do: "Send Calendly + WhatsApp confirmation to 30 candidates — personal", output: "30 confirmations sent" },
        { time: "4:45–5:00", do: "Audit junior HR logs — count, quality, post-interview WhatsApps", output: "Audit done" },
      ],
      metric: "30 locked. Zero data errors in junior HR logs.",
    },
    {
      id: "th_s5", index: 5, name: "Final Block + Pipeline Hygiene",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Hit 20+ total. Brief Jiya for tomorrow.",
      actions: [
        { time: "5:20–6:30", do: "5 buffer interviews. Send all pending WhatsApps", output: "20+ confirmed" },
        { time: "6:30–7:00", do: "Final WhatsApp sweep. Brief Jiya — joiners + intent notes", output: "Jiya briefed" },
      ],
      metric: "Zero unread. Jiya has tomorrow's joiners list.",
    },
  ],
  commWindows: [
    {
      id: "th_w1", label: "Interview Confirmation", atMin: t(10, 45), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 👋 This is Thanvi from Gharpayy.
Your interview is confirmed for {{date}} at {{time}}. The slot is fixed — please be ready 5 minutes early.
Link: {{calendly}}. Reply "Confirmed" ✅`,
    },
    {
      id: "th_w2", label: "Day-Of Reminder (1h before)", atMin: t(11, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}} — your interview starts in 1 hour at {{time}}.
Link: {{link}}. Please don't be late. ☎️`,
    },
    {
      id: "th_w3", label: "Rejection (within 10 min)", atMin: t(13, 0), channel: "WhatsApp 1:1",
      template: `Hi {{name}}, thank you for interviewing with Gharpayy today.
We won't be moving forward at this stage. We wish you the very best. 🙏`,
    },
    {
      id: "th_w4", label: "Selection — Move to Jiya", atMin: t(13, 30), channel: "WhatsApp 1:1",
      template: `Hi {{name}} 🎉 Great speaking with you!
You've cleared Round 1. Our Training Lead Jiya will connect with you shortly for next steps.
Stay reachable on this number!`,
    },
    {
      id: "th_w5", label: "Referral Outreach", atMin: t(14, 30), channel: "WhatsApp 1:1",
      template: `Hi {{name}}, {{referrer}} mentioned you might be a great fit for Gharpayy.
We're building a serious, long-term team of closing operators.
Would you be open to a quick 15-min conversation this week? Here's our link: {{calendly}}`,
    },
  ],
  eodFields: [
    { id: "interviews", label: "Interviews done (X/20)", kind: "text" },
    { id: "junior_hr", label: "Junior HR counts", kind: "list", placeholder: "Name: X | Name: X" },
    { id: "no_shows", label: "No-shows", kind: "number" },
    { id: "rescheduled", label: "Rescheduled", kind: "number" },
    { id: "referrals", label: "Referrals contacted", kind: "number" },
    { id: "profiles", label: "Profiles sourced", kind: "number" },
    { id: "tomorrow", label: "Tomorrow's pipeline locked (X/30)", kind: "text" },
    { id: "wa_clean", label: "WhatsApp backlog zero?", kind: "yesno" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Rejected a referral — not long-term." },
    { id: "flag", label: "Flag for Divyanshu", kind: "text" },
  ],
};

export const PLAYBOOKS: Record<PlaybookKey, RolePlaybook> = {
  communication_shield: NITHYA,
  performance_enforcer: SNEHA_PE,
  training_architect: JIYA,
  talent_engine: THANVI,
};

// Map Employee.id → PlaybookKey
export const PLAYBOOK_BY_OWNER: Record<string, PlaybookKey> = {
  e12: "communication_shield",
  e13: "performance_enforcer",
  e14: "training_architect",
  e15: "talent_engine",
};

export function playbookFor(employeeId: string): RolePlaybook | undefined {
  const key = PLAYBOOK_BY_OWNER[employeeId];
  return key ? PLAYBOOKS[key] : undefined;
}

export function nowMin(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const am = h < 12;
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${mm.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}
