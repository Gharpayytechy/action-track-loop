// Configurable per-user, per-day execution store.
// Playbook-agnostic: every stage submits a bag of field values + proof URLs.
// This is separate from the legacy `execution-os-store` so the two can coexist.

import { todayKey } from "@/lib/attendance-store";

export type ProofBag = Partial<Record<"selfie" | "whatsapp" | "crm_ss" | "file", string>>; // data URLs
export interface GeoStamp { lat?: number; lng?: number; address?: string }

export interface StageSubmission {
  stageId: string;
  ts: number;
  values: Record<string, unknown>; // field id -> value
  proofs: ProofBag;
  geo?: GeoStamp;
  waMessage?: string; // rendered WA block
}

export interface StageDraft {
  values: Record<string, unknown>;
  proofs: ProofBag;
  updatedAt: number;
}

export interface DynDayRecord {
  employeeId: string;
  date: string;
  playbookId: string;
  stageIdx: number;                       // index in resolved playbook
  submissions: Record<string, StageSubmission>; // by stageId
  drafts?: Record<string, StageDraft>;    // by stageId — partial in-progress work
  startedAt?: number;
  finishedAt?: number;
}

const KEY = "gp_dyn_day_v1";
const listeners = new Set<() => void>();
let ver = 0;
function notify() { ver++; listeners.forEach((l) => l()); }
export function subscribeDyn(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function dynVersion() { return ver; }

function readAll(): DynDayRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function writeAll(list: DynDayRecord[]) { localStorage.setItem(KEY, JSON.stringify(list)); notify(); }

export function getOrCreateDay(employeeId: string, playbookId: string, date = todayKey()): DynDayRecord {
  const all = readAll();
  let rec = all.find((r) => r.employeeId === employeeId && r.date === date);
  if (!rec) {
    rec = { employeeId, date, playbookId, stageIdx: 0, submissions: {}, startedAt: Date.now() };
    all.push(rec); writeAll(all);
  } else if (rec.playbookId !== playbookId) {
    // Admin swapped playbook mid-day: keep submissions, update pointer
    rec.playbookId = playbookId;
    writeAll(all);
  }
  return rec;
}

export function saveSubmission(employeeId: string, date: string, sub: StageSubmission, advance: boolean, totalStages: number) {
  const all = readAll();
  let rec = all.find((r) => r.employeeId === employeeId && r.date === date);
  if (!rec) return;
  rec.submissions[sub.stageId] = sub;
  // Submitting clears the draft for this stage
  if (rec.drafts && rec.drafts[sub.stageId]) delete rec.drafts[sub.stageId];
  if (advance) {
    rec.stageIdx = Math.min(rec.stageIdx + 1, totalStages);
    if (rec.stageIdx >= totalStages) rec.finishedAt = Date.now();
  }
  writeAll(all);
}

export function saveDraft(employeeId: string, date: string, stageId: string, draft: { values: Record<string, unknown>; proofs: ProofBag }) {
  const all = readAll();
  const rec = all.find((r) => r.employeeId === employeeId && r.date === date);
  if (!rec) return;
  const hasContent = Object.keys(draft.values).length > 0 || Object.keys(draft.proofs).length > 0;
  if (!rec.drafts) rec.drafts = {};
  if (hasContent) {
    rec.drafts[stageId] = { ...draft, updatedAt: Date.now() };
  } else {
    delete rec.drafts[stageId];
  }
  writeAll(all);
}

export function getDay(employeeId: string, date = todayKey()): DynDayRecord | undefined {
  return readAll().find((r) => r.employeeId === employeeId && r.date === date);
}

export function getAllRecords(): DynDayRecord[] { return readAll(); }

export function getRecordsInRange(from: string, to: string): DynDayRecord[] {
  return readAll().filter((r) => r.date >= from && r.date <= to);
}

export function resetDay(employeeId: string, date = todayKey()) {
  const all = readAll().filter((r) => !(r.employeeId === employeeId && r.date === date));
  writeAll(all);
}