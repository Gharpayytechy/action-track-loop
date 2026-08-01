import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarOff, ChevronDown, Coffee, LogOut, Radio } from "lucide-react";
import {
  PRESENCE_META, effectiveState, fmtSince, heartbeat, presenceFor,
  presenceVersion, seedPresence, setPresence, subscribePresence,
  type PresenceState,
} from "@/lib/presence-store";
import { dayOffWindow, planFor, tomorrowKey, subscribeDayOff, dayOffVersion } from "@/lib/dayoff-store";

const OPTIONS: { state: PresenceState; label: string; hint: string }[] = [
  { state: "active",  label: "Active",  hint: "At the desk, executing" },
  { state: "break",   label: "Break",   hint: "Short break, back soon" },
  { state: "away",    label: "Away",    hint: "Off the floor — visible to your manager" },
  { state: "offline", label: "Offline", hint: "Day closed" },
];

export function PresenceBar({ actorId }: { actorId: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const v = useSyncExternalStore(subscribePresence, () => presenceVersion(), () => 0);
  const dv = useSyncExternalStore(subscribeDayOff, () => dayOffVersion(), () => 0);

  useEffect(() => { seedPresence(); setMounted(true); }, []);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    const beat = () => heartbeat(actorId);
    window.addEventListener("pointerdown", beat);
    window.addEventListener("keydown", beat);
    return () => {
      clearInterval(id);
      window.removeEventListener("pointerdown", beat);
      window.removeEventListener("keydown", beat);
    };
  }, [actorId]);

  if (!mounted) {
    return <div className="h-9 w-[104px] rounded-md border border-border bg-secondary/60" />;
  }

  void v; void dv;
  const rec = presenceFor(actorId);
  const eff = effectiveState(rec);
  const meta = PRESENCE_META[eff];
  const w = dayOffWindow();
  const plan = planFor(actorId, tomorrowKey());

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`h-9 inline-flex items-center gap-2 px-2.5 rounded-md border bg-card text-xs font-medium hover:bg-secondary transition-colors ${meta.tone}`}
          title={`You are ${meta.label} · since ${fmtSince(rec.since)}`}
        >
          <span className={`h-2 w-2 rounded-full ${meta.dot} ${eff === "active" ? "animate-pulse" : ""}`} />
          <span className="font-mono uppercase tracking-widest text-[10px]">{meta.label}</span>
          <span className="hidden lg:inline text-[10px] text-muted-foreground font-mono">{fmtSince(rec.since)}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-64 z-50 rounded-md border border-border bg-card shadow-lg p-1.5">
              <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Set your status
              </div>
              {OPTIONS.map((o) => (
                <button
                  key={o.state}
                  onClick={() => { setPresence(actorId, o.state); setOpen(false); }}
                  className={`w-full flex items-start gap-2 px-2 py-2 rounded text-left hover:bg-secondary ${rec.state === o.state ? "bg-secondary" : ""}`}
                >
                  <span className={`h-2 w-2 rounded-full mt-1.5 ${PRESENCE_META[o.state].dot}`} />
                  <span className="min-w-0">
                    <span className="block text-sm">{o.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.hint}</span>
                  </span>
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1 px-2 py-1.5 text-[11px] text-muted-foreground">
                Idle is automatic after 10 minutes without activity.
              </div>
            </div>
          </>
        )}
      </div>

      <Link
        to="/planned-off"
        title={plan ? "Tomorrow's off is filed" : w.reason}
        className={`hidden sm:inline-flex h-9 items-center gap-1.5 px-2.5 rounded-md border text-[10px] font-mono uppercase tracking-widest transition-colors
          ${plan ? "border-primary/40 text-primary bg-primary/10"
            : w.open ? "border-warning/40 text-warning bg-warning/10 hover:bg-warning/20"
            : "border-border text-muted-foreground hover:bg-secondary"}`}
      >
        <CalendarOff className="h-3.5 w-3.5" />
        {plan ? "Off tomorrow" : w.open ? "Off tomorrow?" : "Plan off"}
      </Link>
    </div>
  );
}

export const PresenceIcons = { Radio, Coffee, LogOut };