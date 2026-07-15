// Default playbooks — one per role + Generic + Custom.
// A playbook = ordered list of Stages; each stage declares required proofs and fields.
// Admin can clone, edit, version, and assign these in /admin/playbooks.

export type ProofKind = "selfie" | "whatsapp" | "crm_ss" | "geo" | "file";

export interface StageDef {
  id: string;
  label: string;
  icon?: string;        // lucide name
  time?: string;        // display only
  proofs: ProofKind[];  // required proofs
  fields: string[];     // field ids from field-library
  requiredFields?: string[];
  waTemplate?: string;  // Handlebars-lite; empty = no WA block
  weight?: number;      // scoring weight
}

export interface Playbook {
  id: string;
  name: string;
  roleHint: string;       // free text: "Operator", "Sales Closer", ...
  description: string;
  version: number;
  active: boolean;
  stages: StageDef[];
  createdAt: number;
  builtIn?: boolean;
}

// ---- WA template presets ----
const WA_LOGIN = `*🌅 GHARPAYY · LOGIN*
👤 {{name}} · {{role}} · {{time}}
✅ Logged in on time`;

const WA_MISSION = `*🎯 GHARPAYY · MISSION*
👤 {{name}} · {{role}} · {{time}}

Priorities:
1. {{mission_1}}
2. {{mission_2}}
3. {{mission_3}}

Goal: {{goal}}
Risk: {{biggest_risk}}
Finish by: {{expected_finish}}`;

const WA_INITIAL = `*⏰ GHARPAYY · INITIAL UPDATE*
👤 {{name}} · {{role}} · {{time}}

Wins so far: {{wins}}
Blockers: {{blockers}}
Next block priority: {{tomorrow_priority}}
KPIs: Calls {{calls}} · Connected {{connected}} · Tours {{tours_sched}}`;

const WA_ONIT = `*🔥 GHARPAYY · ON-IT UPDATE*
👤 {{name}} · {{role}} · {{time}}

Progress: {{wins}}
Still open: {{blockers}}
Push for final block: {{tomorrow_priority}}
KPIs: Calls {{calls}} · Tours done {{tours_done}} · Prebooks {{prebook}}`;

const WA_IMPACT = `*🏁 GHARPAYY · IMPACT · EOD*
👤 {{name}} · {{role}} · {{time}}

Wins: {{wins}}
Learning: {{learning}}
Mistake to fix: {{mistake}}
Tomorrow's #1: {{tomorrow_priority}}

Final KPIs:
• Calls: {{calls}}
• Tours done: {{tours_done}}
• Prebooks: {{prebook}}
• Move-ins: {{movein}}`;

const WA_SALES_EOD = `*💰 GHARPAYY · SALES EOD*
👤 {{name}} · {{role}} · {{time}}

Deals closed: {{deals}} · Revenue: ₹{{revenue}}
Calls: {{calls}} · Connected: {{connected}}
Wins: {{wins}}
Tomorrow: {{tomorrow_priority}}`;

const WA_HR_EOD = `*🧑‍💼 GHARPAYY · HR EOD*
👤 {{name}} · {{role}} · {{time}}

Screens: {{screens}} · Interviews: {{interviews}}
Offers: {{offers}} · Joiners: {{joiners}}
Pipeline: {{candidates_pipeline}}
Tomorrow: {{tomorrow_priority}}`;

const WA_MGR_EOD = `*🧭 GHARPAYY · MANAGER EOD*
👤 {{name}} · {{role}} · {{time}}

Team goal: {{team_goal_pct}}%
1:1s: {{oneones_done}} · Nudges: {{nudges_sent}}
Escalations resolved: {{escalations}}
Tomorrow's focus: {{tomorrow_priority}}`;

const WA_GENERIC_EOD = `*📌 GHARPAYY · EOD UPDATE*
👤 {{name}} · {{role}} · {{time}}

Wins: {{wins}}
Blockers: {{blockers}}
Tomorrow: {{tomorrow_priority}}`;

// ---- Playbook factory helpers ----
function pb(p: Omit<Playbook, "createdAt" | "version" | "active" | "builtIn">): Playbook {
  return { ...p, version: 1, active: true, createdAt: Date.now(), builtIn: true };
}

export const BUILT_IN_PLAYBOOKS: Playbook[] = [
  // -------- Generic (universal fallback) --------
  pb({
    id: "pb_generic",
    name: "Generic Employee",
    roleHint: "Any",
    description: "Universal 4-stage flow: login → mission → mid update → EOD. Works for any function.",
    stages: [
      { id: "login", label: "Login", time: "Start", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "mission", label: "Today's Mission", proofs: [], fields: ["mission_1","mission_2","mission_3","goal","biggest_risk","expected_finish","energy"], requiredFields: ["mission_1","goal"], waTemplate: WA_MISSION, weight: 10 },
      { id: "midday", label: "Mid-day Update", time: "13:00", proofs: ["selfie"], fields: ["wins","blockers","tomorrow_priority"], requiredFields: ["wins"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "eod", label: "EOD Update", time: "18:00", proofs: ["selfie"], fields: ["wins","learning","mistake","tomorrow_priority"], requiredFields: ["wins","tomorrow_priority"], waTemplate: WA_GENERIC_EOD, weight: 30 },
    ],
  }),

  // -------- Operator (matches existing hardcoded flow) --------
  pb({
    id: "pb_operator",
    name: "Operator · Full Execution",
    roleHint: "Operator",
    description: "12-stage GHARPAYY execution: login → mission → baseline → 3 blocks with proof gates → impact.",
    stages: [
      { id: "login", label: "Mission Start", time: "10:35", proofs: ["selfie","geo"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "mission", label: "Today's Mission", proofs: [], fields: ["mission_1","mission_2","mission_3","goal","biggest_risk","expected_finish","energy","calls","tours_sched","prebook","movein"], requiredFields: ["mission_1","mission_2","mission_3","goal"], waTemplate: WA_MISSION, weight: 10 },
      { id: "baseline", label: "Baseline · WA + CRM", time: "10:40", proofs: ["whatsapp"], fields: ["wa_unread"], waTemplate: "", weight: 10 },
      { id: "block1", label: "Block 1 · Execute", time: "10:40–13:15", proofs: [], fields: ["calls","connected","tours_sched","prebook","movein","chats"], waTemplate: "", weight: 0 },
      { id: "break1", label: "Lunch · Initial Update", time: "13:15", proofs: ["selfie","whatsapp"], fields: ["wins","blockers","tomorrow_priority","calls","connected","tours_sched"], requiredFields: ["wins"], waTemplate: WA_INITIAL, weight: 15 },
      { id: "resume1", label: "Resume · Second Half", time: "13:30", proofs: ["selfie"], fields: [], waTemplate: "", weight: 5 },
      { id: "block2", label: "Block 2 · Execute", time: "13:30–17:00", proofs: [], fields: ["calls","connected","tours_done","prebook","movein","chats"], waTemplate: "", weight: 0 },
      { id: "break2", label: "Snacks · On-It Update", time: "17:00", proofs: ["selfie","whatsapp"], fields: ["wins","blockers","tomorrow_priority","calls","tours_done","prebook"], requiredFields: ["wins"], waTemplate: WA_ONIT, weight: 15 },
      { id: "resume2", label: "Resume · Final Push", time: "17:20", proofs: ["selfie"], fields: [], waTemplate: "", weight: 5 },
      { id: "block3", label: "Block 3 · Final Push", time: "17:20–20:00", proofs: [], fields: ["calls","tours_done","prebook","movein","super_lead","reinstate"], waTemplate: "", weight: 0 },
      { id: "impact", label: "Impact · EOD", time: "20:00", proofs: ["selfie","whatsapp"], fields: ["wins","learning","mistake","tomorrow_priority","calls","tours_done","prebook","movein","super_lead"], requiredFields: ["wins","learning","tomorrow_priority"], waTemplate: WA_IMPACT, weight: 30 },
    ],
  }),

  // -------- TCM / Tour Consultant --------
  pb({
    id: "pb_tcm",
    name: "TCM · Tour Consultant",
    roleHint: "TCM",
    description: "Tour-focused: plan → pre-tour proof → tours logged → conversions EOD.",
    stages: [
      { id: "login", label: "Login", time: "10:30", proofs: ["selfie","geo"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "plan", label: "Tour Plan", proofs: [], fields: ["mission_1","mission_2","mission_3","tours_sched"], requiredFields: ["tours_sched"], waTemplate: WA_MISSION, weight: 10 },
      { id: "pre", label: "Pre-tour · CRM SS", proofs: ["crm_ss"], fields: [], waTemplate: "", weight: 5 },
      { id: "block1", label: "Block 1 · Tours", proofs: [], fields: ["tours_done","prebook"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid-day Recap", time: "14:00", proofs: ["selfie"], fields: ["tours_done","wins","blockers","tomorrow_priority"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "block2", label: "Block 2 · Tours", proofs: [], fields: ["tours_done","prebook","movein"], waTemplate: "", weight: 0 },
      { id: "eod", label: "EOD · Conversions", proofs: ["selfie","whatsapp"], fields: ["tours_done","prebook","movein","wins","learning","tomorrow_priority"], requiredFields: ["tours_done","tomorrow_priority"], waTemplate: WA_IMPACT, weight: 30 },
    ],
  }),

  // -------- Sales Closer --------
  pb({
    id: "pb_sales",
    name: "Sales Closer",
    roleHint: "Sales Closer",
    description: "Pipeline → calls & demos → deals + revenue EOD.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "pipeline", label: "Pipeline Snapshot", proofs: ["crm_ss"], fields: ["mission_1","goal","deals"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Calls & Demos", proofs: [], fields: ["calls","connected","deals"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", time: "14:00", proofs: ["selfie"], fields: ["calls","connected","deals","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "block2", label: "Block 2 · Close", proofs: [], fields: ["deals","revenue"], waTemplate: "", weight: 0 },
      { id: "eod", label: "EOD · Deals + Revenue", proofs: ["selfie","crm_ss"], fields: ["deals","revenue","calls","wins","learning","tomorrow_priority"], requiredFields: ["deals","tomorrow_priority"], waTemplate: WA_SALES_EOD, weight: 30 },
    ],
  }),

  // -------- HR / Recruiter --------
  pb({
    id: "pb_hr",
    name: "HR / Recruiter",
    roleHint: "HR",
    description: "Pipeline → screens & interviews → offers + joiners EOD.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "pipeline", label: "ATS Snapshot", proofs: ["crm_ss"], fields: ["candidates_pipeline","mission_1","mission_2"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Screens", proofs: [], fields: ["screens","interviews"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", proofs: ["selfie"], fields: ["screens","interviews","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "block2", label: "Block 2 · Interviews & Offers", proofs: [], fields: ["interviews","offers","joiners"], waTemplate: "", weight: 0 },
      { id: "eod", label: "EOD · Offers + Joiners", proofs: ["selfie"], fields: ["screens","interviews","offers","joiners","wins","learning","tomorrow_priority"], requiredFields: ["tomorrow_priority"], waTemplate: WA_HR_EOD, weight: 30 },
    ],
  }),

  // -------- Floor Lead --------
  pb({
    id: "pb_floor_lead",
    name: "Floor Lead / Team Coach",
    roleHint: "Floor Lead",
    description: "Team readiness → 1:1s and nudges → team scorecard EOD.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "readiness", label: "Team Readiness", proofs: [], fields: ["mission_1","mission_2","team_goal_pct"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Coach", proofs: [], fields: ["oneones_done","nudges_sent","escalations"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", proofs: ["selfie"], fields: ["oneones_done","nudges_sent","team_goal_pct","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "block2", label: "Block 2 · Coach", proofs: [], fields: ["oneones_done","nudges_sent","escalations"], waTemplate: "", weight: 0 },
      { id: "eod", label: "EOD · Team Scorecard", proofs: ["selfie"], fields: ["oneones_done","nudges_sent","escalations","team_goal_pct","wins","learning","tomorrow_priority"], requiredFields: ["team_goal_pct","tomorrow_priority"], waTemplate: WA_MGR_EOD, weight: 30 },
    ],
  }),

  // -------- Ops Manager --------
  pb({
    id: "pb_ops_mgr",
    name: "Ops Manager",
    roleHint: "Ops Manager",
    description: "Site checks, escalations, SLA.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie","geo"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "mission", label: "Today's Focus", proofs: [], fields: ["mission_1","mission_2","mission_3","goal"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Field", proofs: [], fields: ["site_checks","escalations","sla_flags"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", proofs: ["selfie","geo"], fields: ["site_checks","escalations","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "eod", label: "EOD · Ops Snapshot", proofs: ["selfie"], fields: ["site_checks","escalations","sla_flags","wins","learning","tomorrow_priority"], requiredFields: ["tomorrow_priority"], waTemplate: WA_GENERIC_EOD, weight: 30 },
    ],
  }),

  // -------- Marketing --------
  pb({
    id: "pb_marketing",
    name: "Marketing",
    roleHint: "Marketing",
    description: "Leads, campaigns, spend.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "mission", label: "Today's Plan", proofs: [], fields: ["mission_1","mission_2","leads_generated","campaigns_shipped"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Ship", proofs: [], fields: ["leads_generated","campaigns_shipped","spend"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", proofs: ["selfie"], fields: ["leads_generated","campaigns_shipped","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "eod", label: "EOD · Growth Report", proofs: ["selfie"], fields: ["leads_generated","campaigns_shipped","spend","wins","learning","tomorrow_priority"], requiredFields: ["tomorrow_priority"], waTemplate: WA_GENERIC_EOD, weight: 30 },
    ],
  }),

  // -------- Finance --------
  pb({
    id: "pb_finance",
    name: "Finance",
    roleHint: "Finance",
    description: "Collections, invoices, reconciliations.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "mission", label: "Today's Focus", proofs: [], fields: ["mission_1","mission_2","mission_3","collections"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Work", proofs: [], fields: ["collections","invoices","reconciled"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", proofs: ["selfie"], fields: ["collections","invoices","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "eod", label: "EOD · Books", proofs: ["selfie"], fields: ["collections","invoices","reconciled","wins","learning","tomorrow_priority"], requiredFields: ["tomorrow_priority"], waTemplate: WA_GENERIC_EOD, weight: 30 },
    ],
  }),

  // -------- Support --------
  pb({
    id: "pb_support",
    name: "Support",
    roleHint: "Support",
    description: "Tickets, FRT, CSAT.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "mission", label: "Queue Snapshot", proofs: [], fields: ["mission_1","tickets","frt_mins"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 10 },
      { id: "block1", label: "Block 1 · Solve", proofs: [], fields: ["tickets","frt_mins","csat"], waTemplate: "", weight: 0 },
      { id: "mid", label: "Mid Update", proofs: ["selfie"], fields: ["tickets","frt_mins","wins","blockers"], waTemplate: WA_INITIAL, weight: 20 },
      { id: "eod", label: "EOD · Support Report", proofs: ["selfie"], fields: ["tickets","frt_mins","csat","wins","learning","tomorrow_priority"], requiredFields: ["tomorrow_priority"], waTemplate: WA_GENERIC_EOD, weight: 30 },
    ],
  }),

  // -------- Leadership --------
  pb({
    id: "pb_leadership",
    name: "Leadership · War Room",
    roleHint: "Leadership",
    description: "Company snapshot: war room review + EOD summary.",
    stages: [
      { id: "login", label: "Login", proofs: ["selfie"], fields: [], waTemplate: WA_LOGIN, weight: 10 },
      { id: "warroom", label: "War Room Review", proofs: [], fields: ["mission_1","mission_2","mission_3","hard_decision"], requiredFields: ["mission_1"], waTemplate: WA_MISSION, weight: 20 },
      { id: "eod", label: "EOD · Company Snapshot", proofs: ["selfie"], fields: ["wins","learning","hard_decision","tomorrow_priority"], requiredFields: ["tomorrow_priority"], waTemplate: WA_GENERIC_EOD, weight: 30 },
    ],
  }),
];

// ---- Playbook store (localStorage) ----
const KEY = "gp_playbooks_v1";
const ASSIGN_KEY = "gp_playbook_assignments_v1";
const OVERRIDE_KEY = "gp_playbook_overrides_v1";

interface PbState { extras: Playbook[]; disabledBuiltIn: string[] }
function readPb(): PbState {
  if (typeof window === "undefined") return { extras: [], disabledBuiltIn: [] };
  try { return JSON.parse(localStorage.getItem(KEY) || "null") || { extras: [], disabledBuiltIn: [] }; }
  catch { return { extras: [], disabledBuiltIn: [] }; }
}
function writePb(s: PbState) { localStorage.setItem(KEY, JSON.stringify(s)); notify(); }

const subs = new Set<() => void>();
let ver = 0;
function notify() { ver++; subs.forEach((f) => f()); }
export function subscribePlaybooks(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }
export function playbooksVersion() { return ver; }

export function getAllPlaybooks(): Playbook[] {
  const s = readPb();
  const disabled = new Set(s.disabledBuiltIn);
  return [...BUILT_IN_PLAYBOOKS.filter((p) => !disabled.has(p.id)), ...s.extras];
}
export function getPlaybook(id: string): Playbook | undefined {
  return getAllPlaybooks().find((p) => p.id === id);
}
export function upsertPlaybook(p: Playbook) {
  const s = readPb();
  const i = s.extras.findIndex((x) => x.id === p.id);
  if (i >= 0) s.extras[i] = p; else s.extras.push(p);
  writePb(s);
}
export function deletePlaybook(id: string) {
  const s = readPb();
  if (BUILT_IN_PLAYBOOKS.some((p) => p.id === id)) {
    if (!s.disabledBuiltIn.includes(id)) s.disabledBuiltIn.push(id);
  } else {
    s.extras = s.extras.filter((p) => p.id !== id);
  }
  writePb(s);
}
export function clonePlaybook(id: string, newName: string): Playbook | undefined {
  const src = getPlaybook(id);
  if (!src) return;
  const clone: Playbook = {
    ...src,
    id: `pb_custom_${Date.now()}`,
    name: newName,
    version: 1,
    createdAt: Date.now(),
    builtIn: false,
    stages: src.stages.map((s) => ({ ...s })),
  };
  upsertPlaybook(clone);
  return clone;
}

// ---- Assignments (userId -> playbookId) ----
type Assignments = Record<string, string>;
function readAssign(): Assignments {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || "{}"); } catch { return {}; }
}
function writeAssign(a: Assignments) { localStorage.setItem(ASSIGN_KEY, JSON.stringify(a)); notify(); }

export function getAssignment(userId: string): string | undefined { return readAssign()[userId]; }
export function setAssignment(userId: string, playbookId: string) {
  const a = readAssign();
  a[userId] = playbookId;
  writeAssign(a);
}
export function clearAssignment(userId: string) {
  const a = readAssign();
  delete a[userId];
  writeAssign(a);
}
export function getAllAssignments(): Assignments { return readAssign(); }

// ---- Per-user overrides ----
// key: userId -> { hiddenStages: string[], hiddenFields: {stageId:string[]}, requiredExtras: {stageId:string[]}, extraFields: {stageId:string[]} }
export interface UserOverride {
  hiddenStages?: string[];
  hiddenFields?: Record<string, string[]>;
  extraFields?: Record<string, string[]>;
  extraRequired?: Record<string, string[]>;
  targets?: Record<string, number>; // fieldId -> target override
}
type Overrides = Record<string, UserOverride>;
function readOv(): Overrides {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}"); } catch { return {}; }
}
function writeOv(o: Overrides) { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o)); notify(); }
export function getOverride(userId: string): UserOverride { return readOv()[userId] || {}; }
export function setOverride(userId: string, ov: UserOverride) { const o = readOv(); o[userId] = ov; writeOv(o); }
export function clearOverride(userId: string) { const o = readOv(); delete o[userId]; writeOv(o); }

// ---- Resolver: playbook + overrides -> effective stages ----
export function resolvePlaybookFor(userId: string, fallbackByRole?: (u: string) => string | undefined): Playbook | undefined {
  const assigned = getAssignment(userId) || (fallbackByRole && fallbackByRole(userId));
  const pb = assigned ? getPlaybook(assigned) : undefined;
  if (!pb) return undefined;
  const ov = getOverride(userId);
  const hiddenStages = new Set(ov.hiddenStages || []);
  const stages: StageDef[] = [];
  for (const s of pb.stages) {
    if (hiddenStages.has(s.id)) continue;
    const hidden = new Set(ov.hiddenFields?.[s.id] || []);
    const extras = ov.extraFields?.[s.id] || [];
    const extraReq = ov.extraRequired?.[s.id] || [];
    const fields = [...s.fields.filter((f) => !hidden.has(f)), ...extras];
    const requiredFields = Array.from(new Set([...(s.requiredFields || []).filter((f) => !hidden.has(f)), ...extraReq]));
    stages.push({ ...s, fields, requiredFields });
  }
  return { ...pb, stages };
}

// Suggested role → playbook mapping used when no explicit assignment
export function defaultPlaybookForRole(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("operator")) return "pb_operator";
  if (r.includes("tcm") || r.includes("tour")) return "pb_tcm";
  if (r.includes("sales") || r.includes("closer")) return "pb_sales";
  if (r.includes("hr") || r.includes("recruit")) return "pb_hr";
  if (r.includes("floor") || r.includes("coach")) return "pb_floor_lead";
  if (r.includes("ops")) return "pb_ops_mgr";
  if (r.includes("market")) return "pb_marketing";
  if (r.includes("finance")) return "pb_finance";
  if (r.includes("support")) return "pb_support";
  if (r.includes("owner") || r.includes("admin") || r.includes("lead")) return "pb_leadership";
  return "pb_generic";
}