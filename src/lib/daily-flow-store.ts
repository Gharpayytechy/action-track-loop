// Interconnected Daily Flow — one guided script per employee per day.
// Each step captures: selfie (data URL), geo + address, plan/update notes,
// optional WhatsApp screenshot(s). Steps unlock in order and each one also
// logs a matching attendance event so the audit trail stays unified.

import { logEvent, getGeo, reverseGeocode, dateKey, todayKey } from "@/lib/attendance-store";
import { awardXP } from "@/lib/xp-engine";

export type FlowStepId =
  | "start"          // 09:30 · login selfie + today's plan
  | "midday_break"   // 13:15 · lunch break with progress update + WA SS
  | "midday_resume"  // 14:00 · resume second half
  | "evening_break"  // 17:20 · evening break with progress update + WA SS
  | "evening_resume" // 17:40 · resume after break
  | "eod";           // 20:00 · final impact update + WA SS

export interface FlowStep {
  id: FlowStepId;
  ts: number;
  selfie: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  notes: string;
  callsMade?: number;
  toursBooked?: number;
  screenshots: string[]; // data URLs (WhatsApp SS, etc.)
}

export interface DailyFlow {
  employeeId: string;
  date: string; // YYYY-MM-DD
  steps: Partial<Record<FlowStepId, FlowStep>>;
  plan: string; // today's plan captured on start
}

export const FLOW_ORDER: FlowStepId[] = [
  "start",
  "midday_break",
  "midday_resume",
  "evening_break",
  "evening_resume",
  "eod",
];

export const FLOW_META: Record<
  FlowStepId,
  { label: string; time: string; kind: "start" | "break" | "resume" | "eod"; attKind: any; needsUpdate: boolean; needsScreenshot: boolean; needsPlan?: boolean }
> = {
  start:           { label: "Day Start · Goal",     time: "10:35", kind: "start",  attKind: "clock_in",    needsUpdate: false, needsScreenshot: false, needsPlan: true },
  midday_break:    { label: "Break 1",              time: "13:15", kind: "break",  attKind: "break_start", needsUpdate: true,  needsScreenshot: true },
  midday_resume:   { label: "Recovery Commit",      time: "14:00", kind: "resume", attKind: "break_end",   needsUpdate: false, needsScreenshot: false },
  evening_break:   { label: "Break 2",              time: "17:00", kind: "break",  attKind: "break_start", needsUpdate: true,  needsScreenshot: true },
  evening_resume:  { label: "Resume · Final Impact",time: "17:20", kind: "resume", attKind: "break_end",   needsUpdate: false, needsScreenshot: false },
  eod:             { label: "Final Impact · Day End",time: "20:00", kind: "eod",   attKind: "clock_out",   needsUpdate: true,  needsScreenshot: true },
};

const KEY = "gp_daily_flow_v1";
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };
export function subscribeFlow(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function getFlowVersion() { return version; }

function read(): DailyFlow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(all: DailyFlow[]) { localStorage.setItem(KEY, JSON.stringify(all)); emit(); }

export function getFlow(employeeId: string, date = todayKey()): DailyFlow {
  const all = read();
  const found = all.find((f) => f.employeeId === employeeId && f.date === date);
  return found || { employeeId, date, steps: {}, plan: "" };
}

export function getAllFlows(): DailyFlow[] {
  return read();
}

export function nextStepFor(employeeId: string, date = todayKey()): FlowStepId | null {
  const flow = getFlow(employeeId, date);
  for (const id of FLOW_ORDER) if (!flow.steps[id]) return id;
  return null;
}

export function isStepUnlocked(employeeId: string, id: FlowStepId): boolean {
  const flow = getFlow(employeeId);
  const idx = FLOW_ORDER.indexOf(id);
  if (idx === 0) return !flow.steps.start;
  const prev = FLOW_ORDER[idx - 1];
  return !!flow.steps[prev] && !flow.steps[id];
}

export interface SubmitInput {
  employeeId: string;
  stepId: FlowStepId;
  selfie: string;
  notes?: string;
  screenshots?: string[];
  callsMade?: number;
  toursBooked?: number;
  plan?: string; // used on start step
  date?: string;
}

export async function submitStep(input: SubmitInput): Promise<FlowStep> {
  const date = input.date || todayKey();
  const all = read();
  let flow = all.find((f) => f.employeeId === input.employeeId && f.date === date);
  if (!flow) {
    flow = { employeeId: input.employeeId, date, steps: {}, plan: "" };
    all.push(flow);
  }

  // capture geo (best effort)
  let lat: number | null = null, lng: number | null = null, address: string | null = null, accuracy: number | null = null;
  try {
    const fix = await getGeo();
    lat = fix.lat; lng = fix.lng; accuracy = fix.accuracy;
    address = await reverseGeocode(fix.lat, fix.lng);
  } catch {}

  const meta = FLOW_META[input.stepId];
  const step: FlowStep = {
    id: input.stepId,
    ts: Date.now(),
    selfie: input.selfie,
    lat, lng, address,
    notes: input.notes || "",
    callsMade: input.callsMade,
    toursBooked: input.toursBooked,
    screenshots: input.screenshots || [],
  };
  flow.steps[input.stepId] = step;
  if (input.stepId === "start" && input.plan) flow.plan = input.plan;
  write(all);

  // mirror into attendance log so timeline/roster stay accurate
  logEvent({
    employeeId: input.employeeId,
    kind: meta.attKind,
    lat, lng, accuracy, address,
    selfie: input.selfie,
  });

  // reward consistency
  if (input.stepId === "start") awardXP(input.employeeId, "CLOCK_IN_ON_TIME", { amount: 10, note: "Started the day on time" });
  if (input.stepId === "eod")   awardXP(input.employeeId, "EOD_SUBMITTED",   { amount: 25, note: "EOD impact update submitted" });
  return step;
}

export function flowProgress(employeeId: string, date = todayKey()) {
  const flow = getFlow(employeeId, date);
  const done = FLOW_ORDER.filter((id) => flow.steps[id]).length;
  return { done, total: FLOW_ORDER.length, pct: Math.round((done / FLOW_ORDER.length) * 100), flow };
}

export { dateKey };
