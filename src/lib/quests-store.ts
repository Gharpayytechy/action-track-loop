// Quest system — daily/weekly progress per actor.
import { useSyncExternalStore } from "react";
import { makeStore } from "./store";
import { awardXP } from "./xp-engine";
import { awardCoins } from "./coins";

export type QuestKind = "daily" | "weekly";

export interface Quest {
  id: string;
  title: string;
  detail: string;
  kind: QuestKind;
  target: number;
  metric: string;
  xp: number;
  coins: number;
}

// Tour-first quest packs.
export const DAILY_QUESTS: Quest[] = [
  { id: "d-hype-3", title: "3 Hype Calls before noon", detail: "First contact within 2hr is the whole game.", kind: "daily", target: 3, metric: "hype_calls_morning", xp: 100, coins: 50 },
  { id: "d-zero-latency", title: "Zero Latency Day", detail: "Touch every new lead within 2 hours.", kind: "daily", target: 1, metric: "zero_latency_day", xp: 120, coins: 60 },
  { id: "d-packets", title: "Send Visit Packets", detail: "Every scheduled tour gets a packet today.", kind: "daily", target: 3, metric: "packets_sent", xp: 80, coins: 40 },
  { id: "d-schedule-2", title: "Schedule 2 Tours", detail: "Physical or virtual, before 3 PM.", kind: "daily", target: 2, metric: "tours_scheduled", xp: 150, coins: 80 },
  { id: "d-eod", title: "Ship EOD by 8 PM", detail: "Close the loop. Tomorrow starts cleaner.", kind: "daily", target: 1, metric: "eod_shipped", xp: 60, coins: 30 },
];

export const WEEKLY_QUESTS: Quest[] = [
  { id: "w-target-5days", title: "Hit Tour Target 5/5", detail: "Five days, five wins.", kind: "weekly", target: 5, metric: "days_target_hit", xp: 500, coins: 500 },
  { id: "w-zero-miss", title: "Zero Missed Follow-ups", detail: "Every tour-done lead gets a follow-up.", kind: "weekly", target: 5, metric: "zero_miss_days", xp: 400, coins: 400 },
  { id: "w-no-cold", title: "No Cold Leads", detail: "Nothing untouched >24hr all week.", kind: "weekly", target: 5, metric: "warm_days", xp: 350, coins: 350 },
];

interface QuestProgress {
  questId: string;
  count: number;
  claimed: boolean;
  // periodKey identifies day or week so progress resets
  periodKey: string;
}

interface QuestState {
  progress: Record<string, QuestProgress[]>; // actorId -> list
}

const SEED: QuestState = { progress: {} };
const store = makeStore<QuestState>("gp_quests_v1", SEED);

export function ensureQuestSeed() { store.ensureSeed(); }

export function useQuestState(): QuestState {
  return useSyncExternalStore((cb) => store.subscribe(cb), () => store.read(), store.getServerSnapshot);
}

function todayKey() {
  if (typeof window === "undefined") return "ssr";
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey() {
  if (typeof window === "undefined") return "ssr-w";
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function periodKeyFor(kind: QuestKind) { return kind === "daily" ? todayKey() : weekKey(); }

export function progressFor(actorId: string, quest: Quest): QuestProgress {
  const list = store.read().progress[actorId] ?? [];
  const pk = periodKeyFor(quest.kind);
  return list.find((p) => p.questId === quest.id && p.periodKey === pk) ?? { questId: quest.id, count: 0, claimed: false, periodKey: pk };
}

export function bumpQuest(actorId: string, metric: string, by = 1) {
  if (typeof window === "undefined") return;
  const all = [...DAILY_QUESTS, ...WEEKLY_QUESTS].filter((q) => q.metric === metric);
  if (!all.length) return;
  const s = store.read();
  const list = s.progress[actorId] ?? [];
  let next = [...list];
  for (const q of all) {
    const pk = periodKeyFor(q.kind);
    const idx = next.findIndex((p) => p.questId === q.id && p.periodKey === pk);
    if (idx === -1) next.push({ questId: q.id, count: Math.min(q.target, by), claimed: false, periodKey: pk });
    else next[idx] = { ...next[idx], count: Math.min(q.target, next[idx].count + by) };
  }
  // Drop stale entries (older period than current)
  const validDay = todayKey();
  const validWeek = weekKey();
  next = next.filter((p) => p.periodKey === validDay || p.periodKey === validWeek);
  store.write({ progress: { ...s.progress, [actorId]: next } });
}

export function claimQuest(actorId: string, quest: Quest): boolean {
  const s = store.read();
  const list = s.progress[actorId] ?? [];
  const pk = periodKeyFor(quest.kind);
  const idx = list.findIndex((p) => p.questId === quest.id && p.periodKey === pk);
  const cur = idx >= 0 ? list[idx] : null;
  if (!cur || cur.claimed || cur.count < quest.target) return false;
  const next = [...list];
  next[idx] = { ...cur, claimed: true };
  store.write({ progress: { ...s.progress, [actorId]: next } });
  awardXP(actorId, quest.kind === "daily" ? "QUEST_DAILY" : "QUEST_WEEKLY", { amount: quest.xp, note: quest.title });
  awardCoins(actorId, quest.coins, `Quest: ${quest.title}`);
  return true;
}
