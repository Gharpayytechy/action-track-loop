// Per-employee, per-day counters for the four core-role targets, plus the
// recovery plans required by the achievement-enforcement engine.

import { todayKey } from "@/lib/attendance-store";
import type { CoreRoleId } from "@/lib/execution/core-roles";

export interface RecoveryPlan { ts: number; checkpoint: string; metric: string; gap: number; answers: string[] }

export interface CoreDay {
  employeeId: string;
  roleId: CoreRoleId;
  date: string;
  counts: Record<string, number>;
  recoveries: RecoveryPlan[];
}

const KEY = "gp_core_progress_v1";
const listeners = new Set<() => void>();
let ver = 0;
const notify = () => { ver++; listeners.forEach((l) => l()); };
export function subscribeCore(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function coreVersion() { return ver; }

function readAll(): CoreDay[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as CoreDay[]; } catch { return []; }
}
function writeAll(all: CoreDay[]) { localStorage.setItem(KEY, JSON.stringify(all)); notify(); }

function key(r: CoreDay, employeeId: string, roleId: string, date: string) {
  return r.employeeId === employeeId && r.roleId === roleId && r.date === date;
}

export function getCoreDay(employeeId: string, roleId: CoreRoleId, date = todayKey()): CoreDay {
  const all = readAll();
  return all.find((r) => key(r, employeeId, roleId, date))
    || { employeeId, roleId, date, counts: {}, recoveries: [] };
}

function upsert(rec: CoreDay) {
  const all = readAll();
  const i = all.findIndex((r) => key(r, rec.employeeId, rec.roleId, rec.date));
  if (i >= 0) all[i] = rec; else all.push(rec);
  writeAll(all);
}

export function bump(employeeId: string, roleId: CoreRoleId, metric: string, delta: number, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.counts[metric] = Math.max(0, (rec.counts[metric] || 0) + delta);
  upsert(rec);
}

export function addRecovery(employeeId: string, roleId: CoreRoleId, plan: RecoveryPlan, date = todayKey()) {
  const rec = getCoreDay(employeeId, roleId, date);
  rec.recoveries = [...(rec.recoveries || []), plan];
  upsert(rec);
}

/** Last N days of history for one employee+role (oldest first). */
export function history(employeeId: string, roleId: CoreRoleId, days = 14): CoreDay[] {
  const all = readAll().filter((r) => r.employeeId === employeeId && r.roleId === roleId);
  const out: CoreDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    out.push(all.find((r) => r.date === ds) || { employeeId, roleId, date: ds, counts: {}, recoveries: [] });
  }
  return out;
}

/** Everyone working a role today — used by the analytics tab. */
export function allToday(roleId: CoreRoleId, date = todayKey()): CoreDay[] {
  return readAll().filter((r) => r.roleId === roleId && r.date === date);
}
