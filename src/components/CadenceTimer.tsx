// Floating 90/10/10 cadence timer (50min work / 5min rest / 5min break, repeat).
// Mounted globally by AppShell so it follows the user across every page.
import { useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { awardXP } from "@/lib/xp-engine";
import { useAttendanceState } from "@/hooks/useAttendance";
import { bumpQuest } from "@/lib/quests-store";

type Phase = "work" | "rest" | "break";
const DUR: Record<Phase, number> = { work: 50 * 60, rest: 5 * 60, break: 5 * 60 };
const NEXT: Record<Phase, Phase> = { work: "rest", rest: "break", break: "work" };
const LABEL: Record<Phase, string> = { work: "Work", rest: "Rest", break: "Break" };

export function CadenceTimer() {
  const { actor } = useAttendanceState();
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(DUR.work);
  const [running, setRunning] = useState(false);
  const [blocksDone, setBlocksDone] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // Phase complete
        const finished = phase;
        const next = NEXT[finished];
        if (finished === "work") {
          awardXP(actor.id, "CADENCE_BLOCK_DONE", { note: "Focus block complete" });
          bumpQuest(actor.id, "cadence_block");
        }
        setBlocksDone((b) => {
          const nb = finished === "break" ? b + 1 : b;
          if (nb > 0 && nb % 4 === 0) {
            awardXP(actor.id, "CADENCE_ALL_BLOCKS", { note: "Perfect 4-block cycle" });
          }
          return nb;
        });
        setPhase(next);
        return DUR[next];
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, phase, actor.id]);

  const total = DUR[phase];
  const pct = Math.round(((total - remaining) / total) * 100);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const phaseColor = phase === "work" ? "text-primary" : phase === "rest" ? "text-cyan-400" : "text-emerald-400";
  const phaseBg = phase === "work" ? "bg-primary" : phase === "rest" ? "bg-cyan-400" : "bg-emerald-400";
  const Icon = phase === "work" ? Zap : Coffee;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-20 md:bottom-4 right-4 z-30 h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:border-primary/50 transition-colors"
        title="Open cadence timer"
      >
        <Icon className={`h-5 w-5 ${phaseColor}`} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-30 w-60 rounded-lg bg-card border border-border shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${phaseColor}`} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            90/10/10 · {LABEL[phase]}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[10px] text-muted-foreground hover:text-foreground font-mono"
          aria-label="Collapse"
        >
          ─
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between">
          <div className="font-display text-3xl font-semibold tabular-nums">{mm}:{ss}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {blocksDone} blocks
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full ${phaseBg} transition-all duration-300`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >
            {running ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Start</>}
          </button>
          <button
            onClick={() => { setRunning(false); setPhase("work"); setRemaining(DUR.work); }}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-secondary hover:bg-secondary/70"
            title="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
