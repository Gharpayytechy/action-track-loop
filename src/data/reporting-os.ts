// Reporting OS — the daily operating rhythm.
//
//   10:35 AM  Day starts        → goal declared
//   10:36 AM  Commitment        → what must be achieved by 1:15 PM
//   1:15 PM   Phase 1 actuals   → break starts
//   2:00 PM   Break ends        → recovery + acceleration commitment to 5:00 PM
//   5:00 PM   Phase 2 actuals   → final gap identified → break starts
//   5:20 PM   Break ends        → final impact phase begins
//   8:00 PM   Final impact      → tomorrow pipeline locked → day ends
//
// One rule above everything: 10:35 decides the goal, 1:15 exposes reality,
// 5:00 forces recovery, 8:00 measures impact. Nobody is rewarded for being busy.
// Every checkpoint answers: what did you promise, what happened, what is the
// gap, what will you do next, what business outcome did you create?


export type CheckpointId = "gm" | "p1" | "p2" | "p3" | "wrap" | "weekly";

export interface Checkpoint {
  id: CheckpointId;
  code: string;
  label: string;
  clock: string;
  atMin: number;   // when the window opens (minutes from midnight)
  dueMin: number;  // hard deadline
  purpose: string;
}

export type FieldSource = "auto" | "human" | "auto+human";
export type FieldKind = "number" | "percent" | "text" | "yesno" | "list";

export interface ReportField {
  id: string;
  label: string;
  kind: FieldKind;
  source: FieldSource;
  meaning: string;
}

export type RoleFlowKey = "control_tower" | "flow_ops" | "tcm" | "closing";

export interface RoleFlow {
  key: RoleFlowKey;
  title: string;
  subtitle: string;
  mandate: string;
  handsOffTo: string;
  ownerIds: string[];
  accent: "primary" | "success" | "warning" | "destructive";
  checkpoints: Record<CheckpointId, ReportField[]>;
}

const t = (h: number, m = 0) => h * 60 + m;

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: "gm", code: "GOAL", label: "Day Start · Goal", clock: "10:35 AM",
    atMin: t(10, 35), dueMin: t(10, 50),
    purpose: "Declare the goal, then commit: what must be achieved by 1:15 PM?",
  },
  {
    id: "p1", code: "P1", label: "Phase 1 Actuals", clock: "1:15 PM",
    atMin: t(13, 0), dueMin: t(13, 15),
    purpose: "Reality check. Promised vs delivered — then the break starts.",
  },
  {
    id: "p2", code: "RECOVER", label: "Recovery Commit", clock: "2:00 PM",
    atMin: t(14, 0), dueMin: t(14, 20),
    purpose: "Break is over. Name the gap and commit: what must be done by 5:00 PM?",
  },
  {
    id: "p3", code: "P2", label: "Phase 2 Actuals", clock: "5:00 PM",
    atMin: t(16, 45), dueMin: t(17, 0),
    purpose: "Final gap identified. Lock what the impact phase must deliver by 8 PM.",
  },
  {
    id: "wrap", code: "IMPACT", label: "Final Impact · Day End", clock: "8:00 PM",
    atMin: t(19, 30), dueMin: t(20, 0),
    purpose: "Measure the business outcome created. Lock tomorrow's pipeline. Day ends.",
  },
  {
    id: "weekly", code: "WEEK", label: "Weekly Report", clock: "Sunday 8:00 PM",
    atMin: t(19, 30), dueMin: t(20, 30),
    purpose: "Six days of checkpoints turned into decisions.",
  },
];

/** The single line that governs the whole system. */
export const RHYTHM_RULE = [
  "10:35 decides the goal.",
  "1:15 exposes reality.",
  "5:00 forces recovery.",
  "8:00 measures impact.",
];

/** Scheduled recovery breaks that sit between checkpoints. */
export interface BreakWindow {
  id: string;
  label: string;
  clock: string;
  startMin: number;
  endMin: number;
  after: CheckpointId;   // break opens once this checkpoint is filed
  thenWhat: string;      // what the floor owes when the break ends
}

export const BREAKS: BreakWindow[] = [
  {
    id: "b1", label: "Break 1", clock: "1:15 – 2:00 PM",
    startMin: t(13, 15), endMin: t(14, 0), after: "p1",
    thenWhat: "Recovery + acceleration begins. Commit what lands by 5:00 PM.",
  },
  {
    id: "b2", label: "Break 2", clock: "5:00 – 5:20 PM",
    startMin: t(17, 0), endMin: t(17, 20), after: "p3",
    thenWhat: "Final Impact phase begins. Everything now aims at the 8:00 PM outcome.",
  },
];

export function breakAfter(cp: CheckpointId): BreakWindow | undefined {
  return BREAKS.find((b) => b.after === cp);
}

export function activeBreak(m: number): BreakWindow | undefined {
  return BREAKS.find((b) => m >= b.startMin && m < b.endMin);
}

export function checkpointById(id: CheckpointId) {
  return CHECKPOINTS.find((c) => c.id === id)!;
}

// ============================ CONTROL TOWER ============================
const CONTROL_TOWER: RoleFlow = {
  key: "control_tower",
  title: "Control Tower",
  subtitle: "Demand & Flow Owner",
  mandate: "Own the health of the floor: 100% ownership, no silent chat, productive workforce, clean handovers and 30 BBD.",
  handsOffTo: "Leads assigned → Flow Ops",
  ownerIds: ["e12", "e2"],
  accent: "primary",
  checkpoints: {
    gm: [
      { id: "ct_gm_stock", label: "Active lead stock", kind: "number", source: "auto", meaning: "All new + carry-forward + revival requiring action." },
      { id: "ct_gm_unassigned", label: "Unassigned leads", kind: "number", source: "auto", meaning: "Must be 0." },
      { id: "ct_gm_active_emp", label: "Active employees", kind: "number", source: "auto", meaning: "Who is actually working today (HRMS roster)." },
      { id: "ct_gm_nowork", label: "Employees without work", kind: "number", source: "auto", meaning: "Must be 0 unless training / approved status." },
      { id: "ct_gm_waiting", label: "Chats waiting for us", kind: "number", source: "auto", meaning: "Must be 0 beyond SLA." },
      { id: "ct_gm_tours", label: "Tours today", kind: "number", source: "auto", meaning: "Scheduled today across all zones." },
      { id: "ct_gm_risks", label: "Top 3 operating risks", kind: "list", source: "human", meaning: "Exact stage + count + owner." },
      { id: "ct_gm_interventions", label: "Top 3 interventions before 1:15 PM", kind: "list", source: "human", meaning: "What Control Tower will actively fix." },
    ],
    p1: [
      { id: "ct_p1_assigned", label: "Assigned %", kind: "percent", source: "auto", meaning: "Assigned active leads / leads requiring owner." },
      { id: "ct_p1_sla", label: "First action SLA %", kind: "percent", source: "auto", meaning: "Assigned leads receiving first action within SLA." },
      { id: "ct_p1_chat", label: "Chat control %", kind: "percent", source: "auto", meaning: "Active chats with owner + next action + due time." },
      { id: "ct_p1_productive", label: "Productive people", kind: "number", source: "auto", meaning: "Active people showing meaningful role movement." },
      { id: "ct_p1_tours_sched", label: "Tours scheduled", kind: "number", source: "auto", meaning: "Flow Ops source." },
      { id: "ct_p1_visits", label: "Visits today confirmed", kind: "number", source: "auto", meaning: "TCM source." },
      { id: "ct_p1_broken", label: "Primary broken stage", kind: "text", source: "auto+human", meaning: "Largest count / value leakage." },
      { id: "ct_p1_recovery", label: "Recovery plan to 5:00 PM", kind: "text", source: "human", meaning: "Exact people / cases / action / support owner." },
    ],
    p2: [
      { id: "ct_p2_unconf", label: "Unconfirmed tours at risk", kind: "number", source: "auto", meaning: "Tours today not confirmed." },
      { id: "ct_p2_highintent", label: "High-intent chats not moved", kind: "number", source: "auto", meaning: "Qualified but no tour / quote next step." },
      { id: "ct_p2_no_outcome", label: "Completed tours without outcome", kind: "number", source: "auto", meaning: "TCM leakage." },
      { id: "ct_p2_pay_risk", label: "Payments / owner confirmations at risk", kind: "number", source: "auto", meaning: "Closing leakage." },
      { id: "ct_p2_idle", label: "Idle / underloaded people", kind: "number", source: "auto", meaning: "Needs reallocation or diagnosis." },
      { id: "ct_p2_taken", label: "Interventions taken since 1:15 PM", kind: "list", source: "human", meaning: "Action + owner + result." },
      { id: "ct_p2_risk", label: "Risk if we do nothing", kind: "text", source: "human", meaning: "Expected lost tours / bookings / revenue." },
      { id: "ct_p2_support", label: "Support needed before 5:00 PM", kind: "text", source: "human", meaning: "Exact cross-team help." },
    ],
    p3: [
      { id: "ct_p3_bbd", label: "BBD target vs actual", kind: "text", source: "auto", meaning: "21 by P2 / 30 EOD reference." },
      { id: "ct_p3_atrisk", label: "People at risk", kind: "number", source: "auto", meaning: "Who needs intervention before 8 PM." },
      { id: "ct_p3_gaps", label: "Reconciliation gaps", kind: "number", source: "auto", meaning: "Lead / tour / handoff / booking mismatches." },
      { id: "ct_p3_sla_breach", label: "SLA breaches", kind: "number", source: "auto", meaning: "Open customer risk." },
      { id: "ct_p3_closures", label: "3 most important closures by 8 PM", kind: "list", source: "human", meaning: "Named cases / people." },
      { id: "ct_p3_forecast", label: "EOD forecast", kind: "text", source: "human", meaning: "Expected final BBD with rationale." },
      { id: "ct_p3_support", label: "Manager / founder support", kind: "text", source: "human", meaning: "Specific only." },
    ],
    wrap: [
      { id: "ct_w_bbd", label: "Final BBD", kind: "number", source: "auto", meaning: "Verified company booking count." },
      { id: "ct_w_unassigned", label: "Unassigned active leads", kind: "number", source: "auto", meaning: "Must be 0 or approved exception." },
      { id: "ct_w_waiting", label: "Chats waiting beyond SLA", kind: "number", source: "auto", meaning: "Must be 0 or named exception." },
      { id: "ct_w_noactivity", label: "People without meaningful activity", kind: "number", source: "auto", meaning: "Must have intervention / approved reason." },
      { id: "ct_w_recon", label: "Cross-role reconciliation clean?", kind: "yesno", source: "auto", meaning: "All bridges match." },
      { id: "ct_w_win", label: "Biggest win", kind: "text", source: "human", meaning: "What materially improved result." },
      { id: "ct_w_miss", label: "Biggest miss + root cause", kind: "text", source: "human", meaning: "First broken stage, not generic." },
      { id: "ct_w_tomorrow", label: "Tomorrow's operating risk", kind: "text", source: "human", meaning: "What must be fixed first." },
    ],
    weekly: [
      { id: "ct_wk_funnel", label: "Weekly funnel review", kind: "text", source: "auto+human", meaning: "Where demand entered but failed to move." },
      { id: "ct_wk_team", label: "Team performance", kind: "text", source: "human", meaning: "Who improved, who needs help." },
      { id: "ct_wk_wins", label: "Wins / gaps", kind: "list", source: "human", meaning: "Repeatable wins and structural gaps." },
      { id: "ct_wk_plan", label: "Next week plan", kind: "text", source: "human", meaning: "Capacity, training and target changes." },
    ],
  },
};

// ============================== FLOW OPS ==============================
const FLOW_OPS: RoleFlow = {
  key: "flow_ops",
  title: "Flow Ops",
  subtitle: "Lead Conversion",
  mandate: "Every assigned lead gets a first touch inside SLA, a next action, and a scheduled tour.",
  handsOffTo: "Tours scheduled → TCM",
  ownerIds: ["e4", "e13"],
  accent: "success",
  checkpoints: {
    gm: [
      { id: "fo_gm_assigned", label: "Leads assigned", kind: "number", source: "auto", meaning: "Owned stock at start of day." },
      { id: "fo_gm_carry", label: "Carry forward", kind: "number", source: "auto", meaning: "Yesterday's unfinished leads." },
      { id: "fo_gm_focus", label: "3 key focus cases (Lead IDs)", kind: "list", source: "human", meaning: "Highest-intent leads you will personally push." },
      { id: "fo_gm_target", label: "Day target (tours)", kind: "number", source: "human", meaning: "Tours you commit to schedule today." },
    ],
    p1: [
      { id: "fo_p1_calls", label: "Calls done", kind: "number", source: "auto", meaning: "Attempted + connected volume." },
      { id: "fo_p1_chats", label: "Chats done", kind: "number", source: "auto", meaning: "Customers replied / awaiting reply." },
      { id: "fo_p1_tours", label: "Tours scheduled", kind: "number", source: "auto", meaning: "Feeds TCM's day directly." },
      { id: "fo_p1_gaps", label: "Gaps & reasons", kind: "text", source: "human", meaning: "Why the pace is behind, per case." },
    ],
    p2: [
      { id: "fo_p2_qualified", label: "Qualified leads", kind: "number", source: "auto", meaning: "Ready for tour or quote." },
      { id: "fo_p2_tours", label: "Tours scheduled (cumulative)", kind: "number", source: "auto", meaning: "Must reconcile with TCM received." },
      { id: "fo_p2_quotes", label: "Quotes created", kind: "number", source: "auto", meaning: "Commercial movement." },
      { id: "fo_p2_recover", label: "Which cases recover the gap?", kind: "list", source: "human", meaning: "Named Lead IDs, not intentions." },
    ],
    p3: [
      { id: "fo_p3_calls", label: "Total calls", kind: "number", source: "auto", meaning: "Day volume." },
      { id: "fo_p3_tours", label: "Tours scheduled today", kind: "number", source: "auto", meaning: "Final handoff count." },
      { id: "fo_p3_prebook", label: "Quotes / pre-books", kind: "number", source: "auto", meaning: "Pipeline into Closing." },
      { id: "fo_p3_tomorrow", label: "Tomorrow plan", kind: "text", source: "human", meaning: "First three actions at 9:30 AM." },
    ],
    wrap: [
      { id: "fo_w_untouched", label: "Untouched leads", kind: "number", source: "auto", meaning: "Must be 0 or named exception." },
      { id: "fo_w_pending", label: "Pending chats", kind: "number", source: "auto", meaning: "Customer waiting on us." },
      { id: "fo_w_learn", label: "Learnings", kind: "text", source: "human", meaning: "What pitch or source behaved differently." },
      { id: "fo_w_clean", label: "System clean-up done?", kind: "yesno", source: "human", meaning: "Every lead has owner + next action + due time." },
    ],
    weekly: [
      { id: "fo_wk_perf", label: "Weekly performance", kind: "text", source: "auto+human", meaning: "Volume vs conversion, per source." },
      { id: "fo_wk_conv", label: "Conversion analysis", kind: "text", source: "human", meaning: "Where qualified leads died." },
      { id: "fo_wk_top", label: "Top wins / losses", kind: "list", source: "human", meaning: "Patterns worth copying or killing." },
      { id: "fo_wk_improve", label: "Improve plan", kind: "text", source: "human", meaning: "One process change for next week." },
    ],
  },
};

// ================================ TCM ================================
const TCM: RoleFlow = {
  key: "tcm",
  title: "TCM",
  subtitle: "Tour Conversion",
  mandate: "Every scheduled tour is confirmed, conducted and closed with an outcome — no tour dies silently.",
  handsOffTo: "Closing handoffs → Closing Specialist",
  ownerIds: ["e6", "e14"],
  accent: "warning",
  checkpoints: {
    gm: [
      { id: "tcm_gm_assigned", label: "Tours assigned", kind: "number", source: "auto", meaning: "Received from Flow Ops." },
      { id: "tcm_gm_pending", label: "Confirmations pending", kind: "number", source: "auto", meaning: "Unconfirmed tours are tomorrow's no-shows." },
      { id: "tcm_gm_priority", label: "3 priority tours", kind: "list", source: "human", meaning: "Highest-value visits of the day." },
      { id: "tcm_gm_target", label: "Day target (completed tours)", kind: "number", source: "human", meaning: "What you commit to complete." },
    ],
    p1: [
      { id: "tcm_p1_confirmed", label: "Tours confirmed", kind: "number", source: "auto", meaning: "Customer acknowledged time + place." },
      { id: "tcm_p1_enroute", label: "En-route", kind: "number", source: "auto", meaning: "Live visits in motion." },
      { id: "tcm_p1_completed", label: "Completed", kind: "number", source: "auto", meaning: "Visit finished." },
      { id: "tcm_p1_issues", label: "Issues / gaps", kind: "text", source: "human", meaning: "Blockers with Tour IDs." },
    ],
    p2: [
      { id: "tcm_p2_completed", label: "Tours completed", kind: "number", source: "auto", meaning: "Cumulative today." },
      { id: "tcm_p2_high", label: "High intent (7+/10)", kind: "number", source: "auto", meaning: "Real closing candidates." },
      { id: "tcm_p2_quotes", label: "Quotes created", kind: "number", source: "auto", meaning: "Commercial next step exists." },
      { id: "tcm_p2_handoffs", label: "Handoffs to Closing", kind: "number", source: "auto", meaning: "Must reconcile with Closing received." },
    ],
    p3: [
      { id: "tcm_p3_total", label: "Total completed", kind: "number", source: "auto", meaning: "Final tour count." },
      { id: "tcm_p3_quotes", label: "Quotes created", kind: "number", source: "auto", meaning: "Pipeline value created." },
      { id: "tcm_p3_high", label: "High intent count", kind: "number", source: "auto", meaning: "Closing's queue for tomorrow." },
      { id: "tcm_p3_tomorrow", label: "Tomorrow plan", kind: "text", source: "human", meaning: "Confirmations to lock tonight." },
    ],
    wrap: [
      { id: "tcm_w_noshow", label: "No-shows", kind: "number", source: "auto", meaning: "Confirmation quality signal." },
      { id: "tcm_w_feedback", label: "Feedback pending", kind: "number", source: "auto", meaning: "Tours without outcome cannot be trusted." },
      { id: "tcm_w_learn", label: "Learnings", kind: "text", source: "human", meaning: "What changed the customer's mind." },
      { id: "tcm_w_clean", label: "System clean-up done?", kind: "yesno", source: "human", meaning: "Every tour has an outcome + owner." },
    ],
    weekly: [
      { id: "tcm_wk_perf", label: "Weekly performance", kind: "text", source: "auto+human", meaning: "Tours received → completed." },
      { id: "tcm_wk_book", label: "Tour → booking %", kind: "percent", source: "auto", meaning: "True conversion strength." },
      { id: "tcm_wk_learn", label: "Learnings", kind: "list", source: "human", meaning: "Property and pitch patterns." },
      { id: "tcm_wk_improve", label: "Improve plan", kind: "text", source: "human", meaning: "One change to raise conversion." },
    ],
  },
};

// ========================= CLOSING SPECIALIST =========================
const CLOSING: RoleFlow = {
  key: "closing",
  title: "Closing Specialist",
  subtitle: "Deal Closing",
  mandate: "Turn every high-intent opportunity into a verified booking — payment received and owner confirmed.",
  handsOffTo: "Verified bookings (BBD) → Company result",
  ownerIds: ["e15", "e11"],
  accent: "destructive",
  checkpoints: {
    gm: [
      { id: "cl_gm_received", label: "Opportunities received", kind: "number", source: "auto", meaning: "By source, from TCM handoffs." },
      { id: "cl_gm_cases", label: "3 key cases", kind: "list", source: "human", meaning: "Deals you will personally close today." },
      { id: "cl_gm_target", label: "Day target (BBD)", kind: "number", source: "human", meaning: "Verified bookings you commit to." },
      { id: "cl_gm_blockers", label: "Blockers", kind: "text", source: "human", meaning: "Docs, owner approvals, pricing." },
    ],
    p1: [
      { id: "cl_p1_active", label: "Active opportunities", kind: "number", source: "auto", meaning: "In negotiation right now." },
      { id: "cl_p1_quotes", label: "Quotes sent", kind: "number", source: "auto", meaning: "Commercial clarity given." },
      { id: "cl_p1_pay", label: "Payments pending", kind: "number", source: "auto", meaning: "Money in motion." },
      { id: "cl_p1_gaps", label: "Gaps", kind: "text", source: "human", meaning: "Exact reason a deal is stuck." },
    ],
    p2: [
      { id: "cl_p2_neg", label: "Negotiations", kind: "number", source: "auto", meaning: "Live commercial conversations." },
      { id: "cl_p2_due", label: "Payments due", kind: "number", source: "auto", meaning: "Collect before 8 PM." },
      { id: "cl_p2_likely", label: "Bookings likely today", kind: "number", source: "auto+human", meaning: "Forecast with named cases." },
      { id: "cl_p2_escalate", label: "Escalations", kind: "text", source: "human", meaning: "Who must unblock what, by when." },
    ],
    p3: [
      { id: "cl_p3_bbd", label: "Bookings (BBD)", kind: "number", source: "auto", meaning: "Verified only." },
      { id: "cl_p3_pay", label: "Payments received", kind: "number", source: "auto", meaning: "Money actually in." },
      { id: "cl_p3_owner", label: "Owner confirmed", kind: "number", source: "auto", meaning: "Booking is real when owner confirms." },
      { id: "cl_p3_tomorrow", label: "Tomorrow plan", kind: "text", source: "human", meaning: "Carry-forward deals and next actions." },
    ],
    wrap: [
      { id: "cl_w_docs", label: "Docs pending", kind: "number", source: "auto", meaning: "Compliance risk on closed deals." },
      { id: "cl_w_owner", label: "Owner pending", kind: "number", source: "auto", meaning: "Unconfirmed bookings never count as BBD." },
      { id: "cl_w_learn", label: "Learnings", kind: "text", source: "human", meaning: "Objection patterns that worked." },
      { id: "cl_w_clean", label: "System clean-up done?", kind: "yesno", source: "human", meaning: "Every opportunity has status + next action." },
    ],
    weekly: [
      { id: "cl_wk_perf", label: "Weekly performance", kind: "text", source: "auto+human", meaning: "Opportunities → verified bookings." },
      { id: "cl_wk_close", label: "Closing %", kind: "percent", source: "auto", meaning: "Deal efficiency." },
      { id: "cl_wk_rev", label: "Revenue impact", kind: "number", source: "auto", meaning: "BBD revenue for the week." },
      { id: "cl_wk_plan", label: "Next week plan", kind: "text", source: "human", meaning: "Where to focus commercial effort." },
    ],
  },
};

export const ROLE_FLOWS: Record<RoleFlowKey, RoleFlow> = {
  control_tower: CONTROL_TOWER,
  flow_ops: FLOW_OPS,
  tcm: TCM,
  closing: CLOSING,
};

export const ROLE_FLOW_ORDER: RoleFlowKey[] = ["control_tower", "flow_ops", "tcm", "closing"];

// The connected funnel: what each role sends to the next.
export const FUNNEL_BRIDGES: { from: string; sent: string; to: string; received: string }[] = [
  { from: "Control Tower", sent: "Leads requiring ownership", to: "Flow Ops", received: "Leads received" },
  { from: "Flow Ops", sent: "Tours scheduled", to: "TCM", received: "Tours received" },
  { from: "TCM", sent: "High-intent / closing handoffs", to: "Closing", received: "Opportunities received" },
  { from: "Closing", sent: "Verified bookings", to: "Company", received: "BBD" },
];

export function flowForEmployee(employeeId: string): RoleFlow | undefined {
  return ROLE_FLOW_ORDER.map((k) => ROLE_FLOWS[k]).find((f) => f.ownerIds.includes(employeeId));
}

export function checkpointStatus(cp: Checkpoint, nowM: number, submitted: boolean):
  "done" | "live" | "late" | "upcoming" {
  if (submitted) return "done";
  if (nowM < cp.atMin) return "upcoming";
  if (nowM <= cp.dueMin) return "live";
  return "late";
}
