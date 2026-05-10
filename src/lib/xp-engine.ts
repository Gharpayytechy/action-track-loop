// XP Engine — Tour-First. Powers levels, streaks, and the entire game layer.
import { useSyncExternalStore } from "react";
import { makeStore } from "./store";

export const XP_EVENTS = {
  // Flow Ops
  HYPE_CALL_ON_TIME: 50,
  INTENT_CLASSIFIED: 20,
  VISIT_PACKET_SENT: 30,
  TOUR_SCHEDULED: 60,
  DIRECT_BOOKING_ASSISTED: 80,
  ZERO_LATENCY_DAY: 100,
  TWO_HOUR_PULSE: 25,
  // TCM
  INTENT_UPGRADED: 50,
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
  CADENCE_BLOCK_DONE: 10,
  CADENCE_ALL_BLOCKS: 40,
  KUDO_GIVEN: 10,
  KUDO_RECEIVED: 25,
  TASK_CLOSED: 20,
  TASK_CLOSED_EARLY: 50,
  WEEKLY_TOUR_TARGET: 300,
  DAILY_TOUR_TARGET: 80,
  QUEST_DAILY: 100,
  QUEST_WEEKLY: 400,
  ONE_ON_ONE_DONE: 30,
  CANDIDATE_MOVED: 25,
  LOGIN_STREAK_DAY: 20,
} as const;

export type XPEventKey = keyof typeof XP_EVENTS;

export const LEVELS = [
  { min: 1, max: 10, title: "Rookie", multiplier: 1 },
  { min: 11, max: 25, title: "Operator", multiplier: 1.2 },
  { min: 26, max: 40, title: "Closer", multiplier: 1.5 },
  { min: 41, max: 60, title: "Lead", multiplier: 1.8 },
  { min: 61, max: 80, title: "Captain", multiplier: 2.0 },
  { min: 81, max: 100, title: "Legend", multiplier: 2.5 },
] as const;

// Quadratic-ish curve: each level needs (level * 100) more XP.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) total += i * 100;
  return total;
}

export function levelFromXP(xp: number): number {
  let lvl = 1;
  while (lvl < 100 && xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

export function levelTitle(level: number): string {
  return LEVELS.find((l) => level >= l.min && level <= l.max)?.title ?? "Rookie";
}

export function levelProgress(xp: number) {
  const lvl = levelFromXP(xp);
  const cur = xpForLevel(lvl);
  const next = xpForLevel(Math.min(100, lvl + 1));
  const pct = next > cur ? Math.round(((xp - cur) / (next - cur)) * 100) : 100;
  return { level: lvl, title: levelTitle(lvl), xpInLevel: xp - cur, xpToNext: Math.max(0, next - xp), pct };
}

interface XPRecord {
  id: string;
  actorId: string;
  event: XPEventKey | string;
  amount: number;
  ts: number;
  note?: string;
}

interface XPState {
  totals: Record<string, number>; // actorId -> xp
  log: XPRecord[];
  streaks: Record<string, { last: string; days: number }>; // YYYY-MM-DD
}

const SEED: XPState = { totals: {}, log: [], streaks: {} };
const store = makeStore<XPState>("gp_xp_v1", SEED);

export function ensureXPSeed() {
  store.ensureSeed();
}

export function useXPState(): XPState {
  return useSyncExternalStore((cb) => store.subscribe(cb), () => store.read(), store.getServerSnapshot);
}

export function xpFor(actorId: string): number {
  return store.read().totals[actorId] ?? 0;
}

export function recentXP(actorId: string, ms = 7 * 24 * 60 * 60 * 1000): XPRecord[] {
  const cutoff = Date.now() - ms;
  return store.read().log.filter((r) => r.actorId === actorId && r.ts >= cutoff);
}

type Listener = (gain: { actorId: string; event: string; amount: number; note?: string; leveledUp?: boolean; newLevel?: number }) => void;
const xpListeners = new Set<Listener>();
export function onXPGain(fn: Listener) { xpListeners.add(fn); return () => xpListeners.delete(fn); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function awardXP(actorId: string, event: XPEventKey | string, opts: { amount?: number; note?: string } = {}) {
  if (typeof window === "undefined") return;
  const amount = opts.amount ?? (XP_EVENTS as Record<string, number>)[event] ?? 0;
  if (!amount) return;
  const state = store.read();
  const before = state.totals[actorId] ?? 0;
  const after = before + amount;
  const beforeLvl = levelFromXP(before);
  const afterLvl = levelFromXP(after);

  // Streak tracking (1 per day per actor on any award)
  const today = todayStr();
  const cur = state.streaks[actorId];
  let nextStreak = cur ?? { last: today, days: 1 };
  if (cur) {
    if (cur.last === today) nextStreak = cur;
    else {
      const prev = new Date(cur.last);
      const tomorrow = new Date(prev.getTime() + 24 * 60 * 60 * 1000);
      const sameDay = tomorrow.toISOString().slice(0, 10) === today;
      nextStreak = { last: today, days: sameDay ? cur.days + 1 : 1 };
    }
  }

  store.write({
    totals: { ...state.totals, [actorId]: after },
    log: [{ id: crypto.randomUUID(), actorId, event, amount, ts: Date.now(), note: opts.note }, ...state.log].slice(0, 500),
    streaks: { ...state.streaks, [actorId]: nextStreak },
  });

  const leveledUp = afterLvl > beforeLvl;
  xpListeners.forEach((l) => l({ actorId, event: String(event), amount, note: opts.note, leveledUp, newLevel: leveledUp ? afterLvl : undefined }));
}

export function streakFor(actorId: string): number {
  const s = store.read().streaks[actorId];
  if (!s) return 0;
  // Decay if not touched today or yesterday
  const today = todayStr();
  if (s.last === today) return s.days;
  const lastMs = new Date(s.last).getTime();
  const diff = (Date.now() - lastMs) / (24 * 60 * 60 * 1000);
  return diff < 2 ? s.days : 0;
}
