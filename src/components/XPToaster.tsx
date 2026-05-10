// Listens for XP gains and shows transient toast pills + level-up celebration.
import { useEffect, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { onXPGain, levelTitle } from "@/lib/xp-engine";

interface Toast { id: string; amount: number; note?: string; leveledUp?: boolean; newLevel?: number }

export function XPToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return onXPGain((g) => {
      const t: Toast = { id: crypto.randomUUID(), amount: g.amount, note: g.note, leveledUp: g.leveledUp, newLevel: g.newLevel };
      setToasts((cur) => [...cur, t]);
      window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), g.leveledUp ? 4500 : 2200);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-40 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => t.leveledUp ? (
        <div key={t.id} className="pointer-events-auto rounded-lg bg-gradient-to-r from-primary/30 via-primary/20 to-transparent border border-primary/40 px-4 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-left">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display text-sm font-semibold">Level {t.newLevel} — {levelTitle(t.newLevel ?? 1)}!</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">+{t.amount} XP · {t.note ?? "level up"}</div>
            </div>
          </div>
        </div>
      ) : (
        <div key={t.id} className="pointer-events-auto rounded-full bg-card border border-primary/30 px-3 py-1.5 shadow-lg flex items-center gap-2 animate-in slide-in-from-left">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono">+{t.amount} XP</span>
          {t.note && <span className="text-[10px] text-muted-foreground">· {t.note}</span>}
        </div>
      ))}
    </div>
  );
}
