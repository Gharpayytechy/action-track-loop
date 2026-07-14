// Execution OS — the interconnected day.
// Local-first store (multi-user in localStorage) mirroring the Cloud schema
// created in the day_records / stage_events / whatsapp_proofs / kpi_events /
// sla_breaches / exec_updates / daily_scores tables. When real auth lands,
// swap the `read/write` helpers for supabase-js calls — the shape is identical.

import { todayKey } from "@/lib/attendance-store";
import { awardXP } from "@/lib/xp-engine";

export type Stage =
  | "login" | "mission" | "baseline"
  | "block1" | "break1" | "resume1"
  | "block2" | "break2" | "resume2"
  | "block3" | "impact" | "done";

export const STAGE_ORDER: Stage[] = [
  "login","mission","baseline",
  "block1","break1","resume1",
  "block2","break2","resume2",
  "block3","impact","done",
];

export type WaCheckpoint = "baseline" | "initial" | "onit" | "impact";

export type KpiKind =
  | "call" | "connected" | "tour_sched" | "tour_done"
  | "prebook" | "movein" | "super_lead" | "reinstate" | "chat";

export const KPI_META: Record<KpiKind, { label: string; short: string; goalKey: string }> = {
  call:       { label: "Calls",       short: "Call",  goalKey: "calls" },
  connected:  { label: "Connected",   short: "Conn",  goalKey: "connected" },
  tour_sched: { label: "Tours sched", short: "Tour",  goalKey: "toursScheduled" },
  tour_done:  { label: "Tours done",  short: "Done",  goalKey: "toursDone" },
  prebook:    { label: "Prebooks",    short: "Preb",  goalKey: "prebooks" },
  movein:     { label: "Move-ins",    short: "Move",  goalKey: "moveins" },
  super_lead: { label: "Super leads", short: "Super", goalKey: "superLeads" },
  reinstate:  { label: "Reinstate",   short: "Rein",  goalKey: "reinstate" },
  chat:       { label: "Chats",       short: "Chat",  goalKey: "chats" },
};

export const STAGE_META: Record<Stage, { label: string; time: string; kind: string; needsSelfie: boolean; needsWa?: WaCheckpoint }> = {
  login:    { label: "Mission Start",         time: "10:35", kind: "gate",    needsSelfie: true },
  mission:  { label: "Today's Mission",       time: "10:35", kind: "form",    needsSelfie: false },
  baseline: { label: "Baseline · WA + CRM",   time: "10:40", kind: "form",    needsSelfie: false, needsWa: "baseline" },
  block1:   { label: "Block 1 · Execute",     time: "10:40–13:15", kind: "block",  needsSelfie: false },
  break1:   { label: "Lunch Break · Initial", time: "13:15", kind: "gate",    needsSelfie: true, needsWa: "initial" },
  resume1:  { label: "Resume · Second Half",  time: "13:30", kind: "resume",  needsSelfie: true },
  block2:   { label: "Block 2 · Execute",     time: "13:30–17:00", kind: "block",  needsSelfie: false },
  break2:   { label: "Snacks Break · On-It",  time: "17:00", kind: "gate",    needsSelfie: true, needsWa: "onit" },
  resume2:  { label: "Resume · Final Push",   time: "17:20", kind: "resume",  needsSelfie: true },
  block3:   { label: "Block 3 · Execute",     time: "17:20–20:00", kind: "block",  needsSelfie: false },
  impact:   { label: "Impact Submit",         time: "20:00", kind: "impact",  needsSelfie: true, needsWa: "impact" },
  done:     { label: "Day Complete",          time: "—",      kind: "done",    needsSelfie: false },
};

export interface Mission {
  priorities: string[];   // exactly 3
  goal: string;
  risk: string;
  expectedFinish: string;
  energy: 1|2|3|4;
  energyReason?: string;
}

export type KpiGoals = Partial<Record<KpiKind, number>>;

export interface WaProof {
  data: string;    // data URL
  unread: number;
  ts: number;
}

export interface SelfieStamp {
  data: string;
  ts: number;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface KpiEvent { id: string; kind: KpiKind; ts: number }
export interface SlaBreach { id: string; chat: string; hours: number; ts: number }

export interface UpdateBody {
  win?: string;
  blocker?: string;
  nextPriority?: string;
  freeText?: string;
  ts: number;
}

export interface ImpactBody {
  win: string;
  learning: string;
  mistake: string;
  tomorrowPriority: string;
  ts: number;
}

export interface Scorecard {
  points: number;
  goalPct: number;
  breakdown: Array<{ label: string; value: number; ok: boolean }>;
  stars: number; // 0..5
}

export interface DayRecord {
  employeeId: string;
  date: string;
  stage: Stage;
  mission?: Mission;
  goals: KpiGoals;
  selfies: Partial<Record<Stage, SelfieStamp>>;
  whatsapp: Partial<Record<WaCheckpoint, WaProof>>;
  kpiEvents: KpiEvent[];
  slaBreaches: SlaBreach[];
  updates: Partial<Record<"initial" | "onit" | "impact", UpdateBody>>;
  impact?: ImpactBody;
  scorecard?: Scorecard;
  tomorrowPriority?: string;
  startedAt?: number;
  finishedAt?: number;
}

// ---- storage / pub-sub ----
const KEY = "gp_exec_os_v1";
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };
export function subscribeExec(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function getExecVersion() { return version; }

function readAll(): DayRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function writeAll(all: DayRecord[]) { localStorage.setItem(KEY, JSON.stringify(all)); emit(); }

function ensure(employeeId: string, date = todayKey()): DayRecord {
  const all = readAll();
  let rec = all.find((r) => r.employeeId === employeeId && r.date === date);
  if (!rec) {
    rec = {
      employeeId, date, stage: "login",
      goals: { calls: 70, connected: 70, tour_sched: 10, prebook: 3, movein: 1 },
      selfies: {}, whatsapp: {}, kpiEvents: [], slaBreaches: [], updates: {},
    };
    all.push(rec);
    writeAll(all);
  }
  return rec;
}

function save(rec: DayRecord) {
  const all = readAll();
  const i = all.findIndex((r) => r.employeeId === rec.employeeId && r.date === rec.date);
  if (i >= 0) all[i] = rec; else all.push(rec);
  writeAll(all);
}

// ---- reads ----
export function getDay(employeeId: string, date = todayKey()): DayRecord {
  return ensure(employeeId, date);
}
export function getAllToday(date = todayKey()): DayRecord[] {
  return readAll().filter((r) => r.date === date);
}
export function getKpiTotals(rec: DayRecord): Record<KpiKind, number> {
  const out: Record<KpiKind, number> = {
    call: 0, connected: 0, tour_sched: 0, tour_done: 0,
    prebook: 0, movein: 0, super_lead: 0, reinstate: 0, chat: 0,
  };
  for (const e of rec.kpiEvents) out[e.kind]++;
  return out;
}

// ---- transitions ----
export function submitLogin(employeeId: string, selfie: SelfieStamp) {
  const rec = ensure(employeeId);
  if (rec.stage !== "login") return rec;
  rec.selfies.login = selfie;
  rec.startedAt = selfie.ts;
  rec.stage = "mission";
  save(rec);
  awardXP(employeeId, "CLOCK_IN_ON_TIME", { amount: 10, note: "Mission start · logged in" });
  return rec;
}

export function submitMission(employeeId: string, mission: Mission, goals?: KpiGoals) {
  const rec = ensure(employeeId);
  if (rec.stage !== "mission") return rec;
  rec.mission = mission;
  if (goals) rec.goals = { ...rec.goals, ...goals };
  rec.stage = "baseline";
  save(rec);
  return rec;
}

export function submitBaseline(employeeId: string, wa: WaProof) {
  const rec = ensure(employeeId);
  if (rec.stage !== "baseline") return rec;
  rec.whatsapp.baseline = wa;
  rec.stage = "block1";
  save(rec);
  return rec;
}

export function logKpi(employeeId: string, kind: KpiKind) {
  const rec = ensure(employeeId);
  rec.kpiEvents.push({ id: `k_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, kind, ts: Date.now() });
  save(rec);
  return rec;
}
export function undoKpi(employeeId: string, kind: KpiKind) {
  const rec = ensure(employeeId);
  for (let i = rec.kpiEvents.length - 1; i >= 0; i--) {
    if (rec.kpiEvents[i].kind === kind) { rec.kpiEvents.splice(i, 1); break; }
  }
  save(rec);
  return rec;
}

export function flagSla(employeeId: string, chat: string, hours: number) {
  const rec = ensure(employeeId);
  rec.slaBreaches.push({ id: `s_${Date.now()}`, chat, hours, ts: Date.now() });
  save(rec);
  return rec;
}

export function submitBreak(
  employeeId: string,
  which: "break1" | "break2",
  args: { selfie: SelfieStamp; wa: WaProof; body: UpdateBody }
) {
  const rec = ensure(employeeId);
  const expected = which === "break1" ? "break1" : "break2";
  // allow entering break either from the block or from the break stage itself
  const fromBlock = (which === "break1" && rec.stage === "block1") || (which === "break2" && rec.stage === "block2");
  if (!(rec.stage === expected || fromBlock)) return rec;

  rec.selfies[expected] = args.selfie;
  rec.whatsapp[which === "break1" ? "initial" : "onit"] = args.wa;
  rec.updates[which === "break1" ? "initial" : "onit"] = args.body;
  rec.stage = which === "break1" ? "resume1" : "resume2";
  save(rec);
  return rec;
}

export function submitResume(employeeId: string, which: "resume1" | "resume2", selfie: SelfieStamp) {
  const rec = ensure(employeeId);
  if (rec.stage !== which) return rec;
  rec.selfies[which] = selfie;
  rec.stage = which === "resume1" ? "block2" : "block3";
  save(rec);
  return rec;
}

export function submitImpact(
  employeeId: string,
  args: { selfie: SelfieStamp; wa: WaProof; body: ImpactBody }
) {
  const rec = ensure(employeeId);
  if (rec.stage !== "impact" && rec.stage !== "block3") return rec;
  rec.selfies.impact = args.selfie;
  rec.whatsapp.impact = args.wa;
  rec.impact = args.body;
  rec.tomorrowPriority = args.body.tomorrowPriority;
  rec.scorecard = computeScorecard(rec);
  rec.stage = "done";
  rec.finishedAt = Date.now();
  save(rec);
  awardXP(employeeId, "EOD_SUBMITTED", { amount: 25, note: "Impact submitted · day closed" });
  if (rec.scorecard.goalPct >= 100) {
    awardXP(employeeId, "GOAL_HIT", { amount: 50, note: "Hit today's goal 🎯" });
  }
  return rec;
}

// Advance from a completed block into its break gate
export function enterGate(employeeId: string, which: "break1" | "break2" | "impact") {
  const rec = ensure(employeeId);
  if (which === "break1" && rec.stage === "block1") rec.stage = "break1";
  if (which === "break2" && rec.stage === "block2") rec.stage = "break2";
  if (which === "impact" && rec.stage === "block3") rec.stage = "impact";
  save(rec);
  return rec;
}

// ---- scoring ----
export function computeScorecard(rec: DayRecord): Scorecard {
  const totals = getKpiTotals(rec);
  const g = rec.goals;
  const weightedGoal = (["calls","connected","tour_sched","prebook","movein"] as const)
    .map((k) => ({ have: totals[k as KpiKind], want: g[k as KpiKind] || 0 }))
    .filter((x) => x.want > 0);
  const goalPct = weightedGoal.length
    ? Math.round(
        (weightedGoal.reduce((a, x) => a + Math.min(1, x.have / x.want), 0) / weightedGoal.length) * 100,
      )
    : 0;

  const selfiesCount = Object.keys(rec.selfies).length;
  const waCount = Object.keys(rec.whatsapp).length;
  const slaClean = rec.slaBreaches.length === 0;
  const missionSet = !!rec.mission;
  const onTime = rec.startedAt ? new Date(rec.startedAt).getHours() * 60 + new Date(rec.startedAt).getMinutes() <= 10 * 60 + 35 : false;

  let points = 0;
  const breakdown: Scorecard["breakdown"] = [];
  const add = (label: string, value: number, ok: boolean) => { points += ok ? value : 0; breakdown.push({ label, value, ok }); };

  add("Login on time (≤10:35)", 10, onTime);
  add("Mission declared", 10, missionSet);
  add("Baseline proof", 10, !!rec.whatsapp.baseline);
  add("Initial update on time", 15, !!rec.updates.initial);
  add("On-it update on time", 15, !!rec.updates.onit);
  add("Impact submitted", 20, !!rec.impact);
  add("All 6 selfies", 15, selfiesCount >= 6);
  add("All 4 WA proofs", 10, waCount >= 4);
  add("Zero SLA breaches", 25, slaClean);
  add("Goal achieved (≥100%)", 50, goalPct >= 100);

  const maxPossible = breakdown.reduce((a, b) => a + b.value, 0);
  const stars = Math.max(0, Math.min(5, Math.round((points / maxPossible) * 5)));
  return { points, goalPct, breakdown, stars };
}

// Risk chip for the wallboard
export function riskOf(rec: DayRecord): "green" | "amber" | "red" {
  if (rec.stage === "done") return "green";
  const now = Date.now();
  const totals = getKpiTotals(rec);
  const goalPct = rec.goals.calls ? Math.round((totals.call / rec.goals.calls) * 100) : 100;
  const noMove = rec.kpiEvents.length > 0
    ? now - rec.kpiEvents[rec.kpiEvents.length - 1].ts > 60 * 60_000
    : rec.startedAt ? now - rec.startedAt > 60 * 60_000 : false;
  if (rec.slaBreaches.length > 0 || noMove || goalPct < 30) return "red";
  if (goalPct < 70) return "amber";
  return "green";
}

export function stageIndex(s: Stage) { return STAGE_ORDER.indexOf(s); }