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
import { Settings2 } from "lucide-react";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Flow · Execution OS — Gharpayy" },
      { name: "description", content: "Playbook-driven daily execution: role-specific stages, live proofs, WhatsApp-ready updates after every submit." },
    ],
  }),
  component: DailyPage,
});

function DailyPage() {
  const { actor } = useAttendanceState();
  useSyncExternalStore(subscribeDyn, dynVersion, () => 0);
  useSyncExternalStore(subscribePlaybooks, playbooksVersion, () => 0);

  const playbook = resolvePlaybookFor(actor.id, (u) => defaultPlaybookForRole(actor.role));

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
  const pct = Math.round((rec.stageIdx / stages.length) * 100);

  // Merge all previous submissions' values so cumulative KPIs flow into templates
  const previousValues = useMemo(() => {
    const merged: Record<string, unknown> = {};
    for (const s of Object.values(rec.submissions)) Object.assign(merged, s.values);
    return merged;
  }, [rec.submissions]);

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-4xl mx-auto">
      <header className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{playbook.name}</Badge>
              v{playbook.version}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              {actor.name.split(" ")[0]}'s Day · {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{playbook.description}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm py-1 px-3 font-mono">
              Stage {Math.min(rec.stageIdx + 1, stages.length)} / {stages.length}
            </Badge>
            <Link to="/admin/playbooks" className="inline-flex items-center gap-1 text-xs h-9 px-3 rounded-md border hover:bg-secondary">
              <Settings2 className="h-3.5 w-3.5" /> Manage
            </Link>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
      </header>

      <div className="space-y-3">
        {stages.map((stage, i) => {
          const isActive = i === rec.stageIdx;
          const isDone = i < rec.stageIdx;
          const isLocked = i > rec.stageIdx;
          return (
            <StageRenderer
              key={stage.id}
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
              submission={rec.submissions[stage.id]}
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

        {rec.stageIdx >= stages.length && (
          <Card className="p-6 text-center bg-emerald-500/5 border-emerald-500/40">
            <div className="text-4xl mb-2">🏁</div>
            <h2 className="font-display text-2xl font-semibold">Day complete</h2>
            <p className="text-sm text-muted-foreground mt-1">Every stage submitted with proof. Admin dashboard has your full timeline.</p>
            <Link to="/admin/ops" className="mt-4 inline-block"><Button variant="outline">View in Ops Dashboard</Button></Link>
          </Card>
        )}
      </div>
    </div>
  );
}