// GHARp coin economy — earn from quests/wins, spend in /shop.
import { useSyncExternalStore } from "react";
import { makeStore } from "./store";

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  category: "Time" | "Food" | "Recognition" | "Flexibility" | "Theme";
  needsApproval?: boolean;
}

export const SHOP_CATALOG: ShopItem[] = [
  { id: "early-friday", name: "Early Friday", desc: "Leave 1 hour early on Friday", cost: 500, category: "Time", needsApproval: true },
  { id: "lunch-on-us", name: "Lunch on GharPayy", desc: "₹500 lunch credit", cost: 800, category: "Food" },
  { id: "shift-swap", name: "Shift Swap", desc: "Swap shift with a teammate", cost: 300, category: "Flexibility", needsApproval: true },
  { id: "shoutout", name: "Founder Shoutout", desc: "Get called out at the next all-hands", cost: 1000, category: "Recognition", needsApproval: true },
  { id: "wfh-day", name: "Work-From-Home Day", desc: "1 paid WFH day", cost: 1200, category: "Flexibility", needsApproval: true },
  { id: "theme-neon", name: "Neon Arena Theme", desc: "Unlock the Neon UI theme", cost: 200, category: "Theme" },
  { id: "theme-retro", name: "Retro Terminal Theme", desc: "Unlock the Retro UI theme", cost: 600, category: "Theme" },
  { id: "theme-gold", name: "Gold Arena Theme", desc: "Unlock the Gold UI theme", cost: 1500, category: "Theme" },
  { id: "skip-meeting", name: "Skip a Non-Critical Meeting", desc: "One free skip pass", cost: 400, category: "Flexibility", needsApproval: true },
  { id: "priority-zone", name: "Priority Zone Assignment", desc: "Pick your zone for 1 week", cost: 1500, category: "Flexibility", needsApproval: true },
];

export interface CoinTxn {
  id: string;
  actorId: string;
  delta: number;
  reason: string;
  ts: number;
}

export interface Redemption {
  id: string;
  actorId: string;
  itemId: string;
  cost: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  ts: number;
  note?: string;
}

interface CoinState {
  balances: Record<string, number>;
  txns: CoinTxn[];
  redemptions: Redemption[];
  unlockedThemes: Record<string, string[]>;
}

const SEED: CoinState = { balances: {}, txns: [], redemptions: [], unlockedThemes: {} };
const store = makeStore<CoinState>("gp_coins_v1", SEED);

export function ensureCoinsSeed() { store.ensureSeed(); }

export function useCoinState(): CoinState {
  return useSyncExternalStore((cb) => store.subscribe(cb), () => store.read(), store.getServerSnapshot);
}

export function coinsFor(actorId: string): number {
  return store.read().balances[actorId] ?? 0;
}

export function awardCoins(actorId: string, amount: number, reason: string) {
  if (typeof window === "undefined" || amount === 0) return;
  const s = store.read();
  store.write({
    ...s,
    balances: { ...s.balances, [actorId]: (s.balances[actorId] ?? 0) + amount },
    txns: [{ id: crypto.randomUUID(), actorId, delta: amount, reason, ts: Date.now() }, ...s.txns].slice(0, 500),
  });
}

export function redeem(actorId: string, item: ShopItem): { ok: boolean; reason?: string } {
  const s = store.read();
  const bal = s.balances[actorId] ?? 0;
  if (bal < item.cost) return { ok: false, reason: "Not enough GHARp" };
  const themes = s.unlockedThemes[actorId] ?? [];
  if (item.category === "Theme" && themes.includes(item.id)) return { ok: false, reason: "Already unlocked" };
  store.write({
    ...s,
    balances: { ...s.balances, [actorId]: bal - item.cost },
    txns: [{ id: crypto.randomUUID(), actorId, delta: -item.cost, reason: `Redeemed: ${item.name}`, ts: Date.now() }, ...s.txns].slice(0, 500),
    redemptions: [{ id: crypto.randomUUID(), actorId, itemId: item.id, cost: item.cost, status: (item.needsApproval ? "pending" : "fulfilled") as Redemption["status"], ts: Date.now() }, ...s.redemptions].slice(0, 200),
    unlockedThemes: item.category === "Theme"
      ? { ...s.unlockedThemes, [actorId]: [...themes, item.id] }
      : s.unlockedThemes,
  });
  return { ok: true };
}

export function unlockedThemesFor(actorId: string): string[] {
  return store.read().unlockedThemes[actorId] ?? [];
}
