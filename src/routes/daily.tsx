import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore, useState } from "react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { StageRenderer } from "@/components/execution/StageRenderer";
import {
  resolvePlaybookFor, defaultPlaybookForRole, subscribePlaybooks, playbooksVersion,
  type StageDef,
} from "@/lib/execution/playbooks";
import {
  getOrCreateDay, saveSubmission, saveDraft, subscribeDyn, dynVersion,
} from "@/lib/execution/dyn-store";
import { Settings2, Sparkles, ChevronDown, Check, Clock, Circle, Save } from "lucide-react";
import { fmtDuration, totalActiveMs } from "@/lib/execution/insights";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Flow · Execution OS — Gharpayy" },
      { name: "description", content: "A calm, guided day. One step at a time — proofs, updates, and WhatsApp-ready messages built in." },
    ],
  }),
  component: DailyPage,
});

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Group flat stage list into phases (main step + sub-steps)
interface Phase {
  id: string;
  title: string;
  hint: string;
  stages: { stage: StageDef; flatIdx: number }[];
}

function buildPhases(stages: StageDef[]): Phase[] {
  const map = new Map<string, Phase>();
  const order: string[] = [];
  const push = (id: string, title: string, hint: string, entry: { stage: StageDef; flatIdx: number }) => {
    if (!map.has(id)) { map.set(id, { id, title, hint, stages: [] }); order.push(id); }
    map.get(id)!.stages.push(entry);
  };
  stages.forEach((stage, flatIdx) => {
    const id = stage.id;
    const entry = { stage, flatIdx };
    if (id === "login" || id === "mission") push("open", "Open the day", "Land, align, and set the target", entry);
    else if (id.startsWith("c1_") || id === "break1") push("cycle1", "Cycle 1", "Draft → calls → BBD & quotes → recharge", entry);
    else if (id.startsWith("c2_") || id === "break2" || id === "pre_break" || id === "resume") push("cycle2", "Cycle 2", "Draft → calls → BBD & quotes → recharge", entry);
    else if (id.startsWith("c3_")) push("cycle3", "Final push", "One last block for BBD and quotes", entry);
    else if (id === "impact") push("wrap", "Wrap the day", "Learnings, WhatsApp EOD, and logout", entry);
    else push("more", "More", "Additional steps", entry);
  });
  return order.map((k) => map.get(k)!);
}

function DailyPage() {
  const { actor } = useAttendanceState();
  useSyncExternalStore(subscribeDyn, dynVersion, () => 0);
  useSyncExternalStore(subscribePlaybooks, playbooksVersion, () => 0);

  const playbook = resolvePlaybookFor(actor.id, () => defaultPlaybookForRole(actor.role));

  if (!playbook) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <h1 className="font-display text-xl mb-2">No playbook assigned</h1>
          <p className="text-sm text-muted-foreground mb-4">Ask an admin to assign a playbook to your role.</p>
          <Link to="/admin/playbooks"><Button>Open Playbook Manager</Button></Link>
        </Card>
      </div>
    );
  }

  const rec = getOrCreateDay(actor.id, playbook.id);
  const stages = playbook.stages;
  const phases = useMemo(() => buildPhases(stages), [stages]);
  const done = rec.stageIdx;
  const total = stages.length;
  const pct = Math.round((done / total) * 100);

  const previousValues = useMemo(() => {
    const merged: Record<string, unknown> = {};
    for (const s of Object.values(rec.submissions)) Object.assign(merged, s.values);
    return merged;
  }, [rec.submissions]);

  const prevTsFor = (idx: number): number | undefined => {
    if (idx === 0) return rec.startedAt;
    const prevStage = stages[idx - 1];
    return rec.submissions[prevStage?.id]?.ts || rec.startedAt;
  };

  const activeMs = totalActiveMs(rec);

  // Determine phase status
  const phaseStatus = (phase: Phase): "done" | "active" | "locked" => {
    const flatIdxs = phase.stages.map((s) => s.flatIdx);
    const allDone = flatIdxs.every((i) => i < rec.stageIdx);
    if (allDone) return "done";
    const anyActive = flatIdxs.some((i) => i === rec.stageIdx);
    const anyDone = flatIdxs.some((i) => i < rec.stageIdx);
    if (anyActive || anyDone) return "active";
    return "locked";
  };

  const activePhaseId = phases.find((p) => phaseStatus(p) === "active")?.id ?? phases[0]?.id;

  // Per-phase expand state (open the active one by default)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([activePhaseId!]));
  const isOpen = (id: string) => openIds.has(id) || id === activePhaseId;
  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Hero */}
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {playbook.name}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-1">
              {greet()}, {actor.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              {done === 0
                ? "A calm, phase-by-phase day. Open one section, fill what you can, autosave holds the rest."
                : done >= total
                ? "You closed every phase today. Take a bow. 🏁"
                : `You're in ${phases.find((p) => p.id === activePhaseId)?.title ?? "the flow"} — autosave has you covered.`}
            </p>
          </div>
          <Link to="/admin/playbooks" className="inline-flex items-center gap-1 text-xs h-9 px-3 rounded-md border hover:bg-secondary shrink-0">
            <Settings2 className="h-3.5 w-3.5" /> Manage
          </Link>
        </div>

        {/* Phase-based progress */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Today's progress</div>
              <div className="font-display text-2xl font-semibold mt-0.5">
                {phases.filter((p) => phaseStatus(p) === "done").length}
                <span className="text-muted-foreground text-lg font-normal"> of {phases.length} phases</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Time on flow</div>
              <div className="font-mono text-lg font-medium">{activeMs ? fmtDuration(activeMs) : "—"}</div>
            </div>
            <Badge variant="outline" className="ml-auto font-mono">{pct}%</Badge>
          </div>
          <Progress value={pct} className="h-1.5 mt-3" />
          <div className="flex justify-between mt-2 gap-2">
            {phases.map((p) => {
              const st = phaseStatus(p);
              return (
                <div key={p.id} className="flex-1 min-w-0">
                  <div className={`h-1 rounded-full ${st === "done" ? "bg-emerald-500" : st === "active" ? "bg-primary" : "bg-border"}`} />
                  <div className={`mt-1 text-[10px] font-mono uppercase tracking-widest truncate ${st === "active" ? "text-foreground" : "text-muted-foreground"}`}>
                    {p.title}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </header>

      {/* Phases */}
      <div className="space-y-3">
        {phases.map((phase) => {
          const st = phaseStatus(phase);
          const open = isOpen(phase.id);
          const total = phase.stages.length;
          const doneCount = phase.stages.filter((s) => s.flatIdx < rec.stageIdx).length;
          const draftCount = phase.stages.filter((s) => rec.drafts?.[s.stage.id]).length;
          return (
            <Card key={phase.id} className={`overflow-hidden transition-all ${
              st === "active" ? "border-primary/40 shadow-md" :
              st === "done" ? "border-emerald-500/30 bg-emerald-500/[0.02]" :
              "border-border/60 opacity-90"
            }`}>
              <button
                onClick={() => toggle(phase.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                  st === "done" ? "bg-emerald-500 text-white" :
                  st === "active" ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {st === "done" ? <Check className="h-4 w-4" /> : st === "active" ? <Clock className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-base leading-tight">{phase.title}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      {doneCount}/{total} tasks
                    </span>
                    {draftCount > 0 && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-600 inline-flex items-center gap-1">
                        <Save className="h-3 w-3" /> {draftCount} in progress
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.hint}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="px-4 pb-4 space-y-2 border-t border-border/40 pt-3">
                  {phase.stages.map(({ stage, flatIdx }, subIdx) => {
                    const isActive = flatIdx === rec.stageIdx;
                    const isDone = flatIdx < rec.stageIdx;
                    const isLocked = flatIdx > rec.stageIdx;
                    const draft = rec.drafts?.[stage.id];
                    const draftForRenderer = draft ? {
                      values: draft.values,
                      proofs: draft.proofs as Record<string, string | undefined>,
                      updatedAt: draft.updatedAt,
                    } : undefined;
                    return (
                      <StageRenderer
                        key={stage.id}
                        stage={stage}
                        subLabel={`Task ${subIdx + 1} of ${phase.stages.length}`}
                        isActive={isActive}
                        isDone={isDone}
                        isLocked={isLocked}
                        employeeId={actor.id}
                        employeeName={actor.name}
                        employeeRole={actor.role}
                        previousValues={previousValues}
                        startedAt={rec.startedAt}
                        prevSubmitTs={prevTsFor(flatIdx)}
                        submission={rec.submissions[stage.id]}
                        draft={draftForRenderer}
                        onDraft={(payload) => saveDraft(actor.id, rec.date, stage.id, payload)}
                        onSubmit={(payload) => {
                          saveSubmission(actor.id, rec.date, {
                            stageId: stage.id, ts: Date.now(),
                            values: payload.values, proofs: payload.proofs,
                            waMessage: payload.waMessage,
                          }, true, stages.length);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {rec.stageIdx >= stages.length && (
          <Card className="p-6 text-center bg-emerald-500/5 border-emerald-500/40 animate-fade-in">
            <div className="text-5xl mb-2">🏁</div>
            <h2 className="font-display text-2xl font-semibold">Day complete</h2>
            <p className="text-sm text-muted-foreground mt-1">Every phase closed with proof · total time {fmtDuration(activeMs)}.</p>
            <Link to="/admin/ops" className="mt-4 inline-block"><Button variant="outline">View in Ops Dashboard</Button></Link>
          </Card>
        )}
      </div>
    </div>
  );
}
