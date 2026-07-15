// Admin-editable configuration for the daily flow UI.
// - KPI keys shown on the "Today so far" strip
// - Per-phase title and helper text
// Everything persists to localStorage; admins edit from /admin/ops → Config.

export interface PhaseCopy {
  id: string;
  title: string;
  hint: string;
}

export const DEFAULT_KPI_KEYS: string[] = [
  "bbd",
  "quotations",
  "cold_calls",
  "connected_calls",
  "checks_drafted",
  "doors_initiated",
];

export const DEFAULT_PHASES: PhaseCopy[] = [
  { id: "kickoff",   title: "Morning kickoff",     hint: "Log in, set today's targets, share the plan." },
  { id: "morning",   title: "Morning work block",  hint: "Draft 30 checks, run the call sheet, close first-cycle quotes." },
  { id: "afternoon", title: "Afternoon work block",hint: "Repeat the cycle with sharper intent, then take the second break." },
  { id: "evening",   title: "Evening push",        hint: "Final push for bookings and quotations before wrap." },
  { id: "wrap",      title: "Day wrap",            hint: "Reflect on the day, send the end-of-day update, and log out." },
  { id: "more",      title: "Additional tasks",    hint: "Anything outside the standard cycle." },
];

const KEY = "gp_daily_config_v1";

interface Cfg {
  kpiKeys: string[];
  phases: Record<string, PhaseCopy>;
}

const listeners = new Set<() => void>();
let ver = 0;
function notify() { ver++; listeners.forEach((l) => l()); }
export function subscribeDailyCfg(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function dailyCfgVersion() { return ver; }

function read(): Cfg {
  if (typeof window === "undefined") return { kpiKeys: DEFAULT_KPI_KEYS, phases: Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])) };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { kpiKeys: DEFAULT_KPI_KEYS, phases: Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])) };
    const parsed = JSON.parse(raw) as Partial<Cfg>;
    return {
      kpiKeys: parsed.kpiKeys?.length ? parsed.kpiKeys : DEFAULT_KPI_KEYS,
      phases: { ...Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])), ...(parsed.phases || {}) },
    };
  } catch {
    return { kpiKeys: DEFAULT_KPI_KEYS, phases: Object.fromEntries(DEFAULT_PHASES.map((p) => [p.id, p])) };
  }
}
function write(c: Cfg) { localStorage.setItem(KEY, JSON.stringify(c)); notify(); }

export function getKpiKeys(): string[] { return read().kpiKeys; }
export function setKpiKeys(keys: string[]) { const c = read(); c.kpiKeys = keys.filter(Boolean); write(c); }

export function getPhaseCopy(id: string): PhaseCopy {
  const c = read();
  return c.phases[id] || DEFAULT_PHASES.find((p) => p.id === id) || { id, title: id, hint: "" };
}
export function getAllPhaseCopy(): PhaseCopy[] {
  const c = read();
  return DEFAULT_PHASES.map((p) => c.phases[p.id] || p);
}
export function setPhaseCopy(id: string, patch: Partial<PhaseCopy>) {
  const c = read();
  c.phases[id] = { ...(c.phases[id] || DEFAULT_PHASES.find((p) => p.id === id) || { id, title: id, hint: "" }), ...patch, id };
  write(c);
}
export function resetDailyCfg() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  notify();
}
