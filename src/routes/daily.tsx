import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore } from "react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { StageRenderer } from "@/components/execution/StageRenderer";
import {
  resolvePlaybookFor, defaultPlaybookForRole, subscribePlaybooks, playbooksVersion,
} from "@/lib/execution/playbooks";
import {
  getOrCreateDay, saveSubmission, subscribeDyn, dynVersion,
} from "@/lib/execution/dyn-store";
import { Settings2, Sparkles } from "lucide-react";
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
  const done = rec.stageIdx;
  const total = stages.length;
  const pct = Math.round((done / total) * 100);
  const remaining = total - done;

  const previousValues = useMemo(() => {
    const merged: Record<string, unknown> = {};
    for (const s of Object.values(rec.submissions)) Object.assign(merged, s.values);
    return merged;
  }, [rec.submissions]);

  // Build a list of previous submit timestamps to compute per-stage fill time
  const sortedSubs = Object.values(rec.submissions).sort((a, b) => a.ts - b.ts);
  const prevTsFor = (idx: number): number | undefined => {
    if (idx === 0) return rec.startedAt;
    // previous stage timestamp = submission of stage idx-1 if present
    const prevStage = stages[idx - 1];
    return rec.submissions[prevStage?.id]?.ts || rec.startedAt;
  };

  const activeMs = totalActiveMs(rec);

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
                ? "Let's start the day gently — one step at a time."
                : done >= total
                ? "You completed every step today. Take a bow. 🏁"
                : `Nice pace — ${done} done, ${remaining} to go. You've got this.`}
            </p>
          </div>
          <Link to="/admin/playbooks" className="inline-flex items-center gap-1 text-xs h-9 px-3 rounded-md border hover:bg-secondary shrink-0">
            <Settings2 className="h-3.5 w-3.5" /> Manage
          </Link>
        </div>

        {/* Progress card — replaces harsh "N/12" */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Today's progress</div>
              <div className="font-display text-2xl font-semibold mt-0.5">
                {done} <span className="text-muted-foreground text-lg font-normal">of {total} steps</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Time on flow</div>
              <div className="font-mono text-lg font-medium">{activeMs ? fmtDuration(activeMs) : "—"}</div>
            </div>
            <Badge variant="outline" className="ml-auto font-mono">{pct}%</Badge>
          </div>
          <Progress value={pct} className="h-2 mt-3" />
          <div className="flex justify-between mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>Start</span>
            <span>Break</span>
            <span>Push</span>
            <span>Wrap</span>
          </div>
        </Card>
      </header>

      {/* Timeline with left rail connector */}
      <div className="relative space-y-3">
        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border md:left-[29px]" aria-hidden />
        {stages.map((stage, i) => {
          const isActive = i === rec.stageIdx;
          const isDone = i < rec.stageIdx;
          const isLocked = i > rec.stageIdx;
          return (
            <div key={stage.id} className="relative">
              <StageRenderer
                stage={stage}
                stageIdx={i}
                totalStages={stages.length}
                isActive={isActive}
                isDone={isDone}
                isLocked={isLocked}
                employeeId={actor.id}
                employeeName={actor.name}
                employeeRole={actor.role}
                previousValues={previousValues}
                startedAt={rec.startedAt}
                prevSubmitTs={prevTsFor(i)}
                submission={rec.submissions[stage.id]}
                onSubmit={(payload) => {
                  saveSubmission(actor.id, rec.date, {
                    stageId: stage.id, ts: Date.now(),
                    values: payload.values, proofs: payload.proofs,
                    waMessage: payload.waMessage,
                  }, true, stages.length);
                }}
              />
            </div>
          );
        })}

        {rec.stageIdx >= stages.length && (
          <Card className="p-6 text-center bg-emerald-500/5 border-emerald-500/40 animate-fade-in">
            <div className="text-5xl mb-2">🏁</div>
            <h2 className="font-display text-2xl font-semibold">Day complete</h2>
            <p className="text-sm text-muted-foreground mt-1">Every step submitted with proof · total time {fmtDuration(activeMs)}.</p>
            <Link to="/admin/ops" className="mt-4 inline-block"><Button variant="outline">View in Ops Dashboard</Button></Link>
          </Card>
        )}
      </div>
    </div>
  );
}
