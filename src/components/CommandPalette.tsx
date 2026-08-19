import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EMPLOYEES } from "@/data/seed";
import { Avatar } from "./Avatar";
import { Search } from "lucide-react";

const RESULTS = [
  ...EMPLOYEES.map((e) => ({ kind: "person" as const, id: e.id, label: e.name, sub: `${e.role} · ${e.team}`, to: "/people" })),
  { kind: "page" as const, id: "p1", label: "War Room", sub: "Live ops command bridge", to: "/war-room" },
  { kind: "page" as const, id: "p2", label: "Calendar", sub: "All shifts, tours, tasks", to: "/calendar" },
  { kind: "page" as const, id: "p3", label: "Tasks", sub: "Personal Kanban", to: "/tasks" },
  { kind: "page" as const, id: "p4", label: "Kudos feed", sub: "Recognition wall", to: "/kudos" },
  { kind: "page" as const, id: "p5", label: "Score card", sub: "Your performance", to: "/score" },
  { kind: "page" as const, id: "p6", label: "Coach", sub: "AI command center", to: "/command" },
  { kind: "page" as const, id: "p7", label: "Inbox", sub: "All notifications", to: "/inbox" },
  { kind: "page" as const, id: "p8", label: "Roster", sub: "Live attendance map", to: "/roster" },
  { kind: "page" as const, id: "p9", label: "All Role Flows", sub: "Tech, HR, Recruitment & every other role flow", to: "/flows" },
  { kind: "page" as const, id: "p10", label: "Reporting OS", sub: "Day flow: 10:35 → 1:15 → 2:00 → 5:00 → 8:00", to: "/reporting" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = q
    ? RESULTS.filter((r) =>
        (r.label + " " + (r.sub ?? "")).toLowerCase().includes(q.toLowerCase())
      ).slice(0, 12)
    : RESULTS.slice(0, 8);

  return (
    <div className="fixed inset-0 z-[100] bg-sidebar/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, pages, anything…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-sm text-center text-muted-foreground">
              Nothing matches "{q}". Try a different word.
            </div>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => { navigate({ to: r.to }); onClose(); }}
              className="w-full text-left px-4 py-2 hover:bg-secondary/60 transition-colors flex items-center gap-3"
            >
              {r.kind === "person" ? (
                <Avatar id={r.id} size={32} />
              ) : (
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Search className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{r.label}</div>
                {r.sub && <div className="text-xs text-muted-foreground truncate">{r.sub}</div>}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{r.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
