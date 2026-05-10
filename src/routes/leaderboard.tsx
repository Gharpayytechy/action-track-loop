import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Medal, Trophy } from "lucide-react";
import { EMPLOYEES } from "@/data/seed";
import { Avatar } from "@/components/Avatar";
import { coinsFor, useCoinState } from "@/lib/coins";
import { levelProgress, streakFor, useXPState, xpFor } from "@/lib/xp-engine";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Arena Leaderboard — GHARPAYY" },
      { name: "description", content: "Live rankings: XP, GHARp, streaks, tours." },
    ],
  }),
  component: LeaderboardPage,
});

const TABS = ["XP", "GHARp", "Streak"] as const;
type Tab = typeof TABS[number];

function LeaderboardPage() {
  useXPState();
  useCoinState();
  const [tab, setTab] = useState<Tab>("XP");

  const rows = useMemo(() => {
    return EMPLOYEES.map((e) => ({
      e,
      xp: xpFor(e.id),
      coins: coinsFor(e.id),
      streak: streakFor(e.id),
      lp: levelProgress(xpFor(e.id)),
    })).sort((a, b) => {
      if (tab === "XP") return b.xp - a.xp;
      if (tab === "GHARp") return b.coins - a.coins;
      return b.streak - a.streak;
    });
  }, [tab]);

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
      <header className="mb-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Arena Leaderboard</div>
        <h1 className="font-display text-2xl md:text-4xl font-semibold">Who's running the floor today?</h1>
      </header>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 h-8 rounded-md text-xs font-mono uppercase tracking-widest border ${tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {rows.map((r, i) => {
          const medal = i === 0 ? <Crown className="h-4 w-4 text-amber-400" /> : i === 1 ? <Medal className="h-4 w-4 text-slate-300" /> : i === 2 ? <Medal className="h-4 w-4 text-orange-400" /> : null;
          const primary = tab === "XP" ? r.xp.toLocaleString() : tab === "GHARp" ? r.coins.toLocaleString() : `${r.streak}d`;
          const sub = tab === "XP" ? `${r.lp.title} · L${r.lp.level}` : tab === "GHARp" ? "GHARp earned" : "day streak";
          return (
            <div key={r.e.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 ${i < 3 ? "bg-primary/5" : ""}`}>
              <div className="w-8 text-center font-mono text-sm text-muted-foreground tabular-nums">{i + 1}</div>
              <Avatar id={r.e.id} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{r.e.name}</span>
                  {medal}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{r.e.role} · {r.e.team}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-semibold tabular-nums">{primary}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <Trophy className="h-5 w-5 text-primary" />
        <div className="text-sm">
          <div className="font-display font-semibold">Power Hour active 11:00–12:00 daily</div>
          <div className="text-xs text-muted-foreground">Every XP event gets a 2× boost. Schedule your hardest tours then.</div>
        </div>
      </div>
    </div>
  );
}
