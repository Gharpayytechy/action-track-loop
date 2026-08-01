// Step-by-step "run the day" experience: one instruction on screen at a time,
// in the exact order the role is supposed to execute it. Tick it, log the unit,
// submit the phase report, close the phase, move to the next.
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Minus, PartyPopper, Plus, Target,
} from "lucide-react";
import type { CoreRole } from "@/lib/execution/core-roles";
import { BAND_META, bandFor, targetAt } from "@/lib/execution/core-roles";
import { phasesFor, activePhaseId, type FlowPhase } from "@/lib/execution/core-tasks";
import { bump, completePhase, startPhase, toggleStep, type CoreDay } from "@/lib/execution/core-progress";
import { PhaseReportForm } from "./PhaseReportForm";

type Item =
  | { kind: "step"; phase: FlowPhase; stepIndex: number }
  | { kind: "report"; phase: FlowPhase }
  | { kind: "close"; phase: FlowPhase };

const pct = (h: number, w: number) => (w <= 0 ? 100 : Math.round((h / w) * 100));

export function GuidedRun({ role, actorId, day }: { role: CoreRole; actorId: string; day: CoreDay }) {
  const phases = useMemo(() => phasesFor(role), [role]);
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const p of phases) {
      p.steps.forEach((_, i) => out.push({ kind: "step", phase: p, stepIndex: i }));
      out.push({ kind: "report", phase: p });
      out.push({ kind: "close", phase: p });
    }
    return out;
  }, [phases]);

  const isDone = (it: Item) => {
    if (it.kind === "step") return !!day.checks[it.phase.steps[it.stepIndex].id];
    if (it.kind === "report") return !!day.submissions?.[it.phase.id];
    return !!day.phases[it.phase.id]?.doneAt;
  };

  const firstOpen = Math.max(0, items.findIndex((it) => !isDone(it)));
  const [cursor, setCursor] = useState<number | null>(null);
  const idx = cursor === null ? (items.every(isDone) ? items.length - 1 : firstOpen) : Math.min(cursor, items.length - 1);
  const item = items[idx];
  const allDone = items.every(isDone);

  const go = (n: number) => setCursor(Math.max(0, Math.min(items.length - 1, idx + n)));
  const advance = () => setCursor(null);

  const totalTicks = items.length;
  const doneTicks = items.filter(isDone).length;
  const nowPhase = activePhaseId();

  return (
    <div className="space-y-5">
      {/* phase rail */}
      <div className="grid grid-cols-5 gap-2">
        {phases.map((p) => {
          const total = p.steps.length + 2;
          const done =
            p.steps.filter((s) => day.checks[s.id]).length +
            (day.submissions?.[p.id] ? 1 : 0) +
            (day.phases[p.id]?.doneAt ? 1 : 0);
          const closed = !!day.phases[p.id]?.doneAt;
          const current = item?.phase.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setCursor(items.findIndex((it) => it.phase.id === p.id))}
              className={`rounded-md border p-2 text-left transition-colors ${
                closed ? "border-success/50 bg-success/5"
                : current ? "border-primary/60 bg-primary/5"
                : p.id === nowPhase ? "border-warning/50" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {closed ? <Check className="h-3 w-3 text-success" /> : <Clock className="h-3 w-3" />}
                {p.due}
              </div>
              <div className="text-xs font-medium truncate mt-0.5">{p.codename}</div>
              <Progress value={(done / total) * 100} className="mt-1.5 h-1" />
            </button>
          );
        })}
      </div>

      {allDone ? (
        <Card className="p-6 border-success/50 bg-success/5 text-center space-y-2">
          <PartyPopper className="h-6 w-6 mx-auto text-success" />
          <div className="font-display text-xl font-semibold">Day complete — every step ticked, every report in.</div>
          <p className="text-sm text-muted-foreground">Handover is with {role.handoverTo}. Tomorrow starts from your Impact report.</p>
        </Card>
      ) : (
        <Card className="p-5 md:p-6 space-y-4 border-primary/40">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{item.phase.codename}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">{item.phase.window}</Badge>
            <span className="ml-auto text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Step {idx + 1} of {totalTicks}
            </span>
          </div>

          <div className="text-[11px] font-mono uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> This is what we are supposed to do next
          </div>

          {item.kind === "step" && (() => {
            const s = item.phase.steps[item.stepIndex];
            const ticked = !!day.checks[s.id];
            return (
              <>
                <div className="font-display text-xl md:text-2xl font-semibold leading-snug">{s.label}</div>
                {s.detail && <p className="text-sm text-muted-foreground">{s.detail}</p>}
                {s.evidence && (
                  <div className="inline-flex text-[10px] font-mono uppercase tracking-widest text-primary border border-primary/30 rounded px-2 py-1">
                    Evidence required: {s.evidence}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={() => {
                      if (!ticked) toggleStep(actorId, role.id, s.id);
                      startPhase(actorId, role.id, item.phase.id);
                      advance();
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" /> {ticked ? "Done — next step" : "I did this"}
                  </Button>
                  {ticked && (
                    <Button variant="outline" onClick={() => toggleStep(actorId, role.id, s.id)}>Untick</Button>
                  )}
                </div>
              </>
            );
          })()}

          {item.kind === "report" && (
            <>
              <div className="font-display text-xl md:text-2xl font-semibold leading-snug">
                Submit the {item.phase.codename} report
              </div>
              <p className="text-sm text-muted-foreground">{item.phase.brief}</p>
              <PhaseReportForm
                phase={item.phase}
                actorId={actorId}
                roleId={role.id}
                existing={day.submissions?.[item.phase.id]?.values}
                submittedAt={day.submissions?.[item.phase.id]?.ts}
                counts={day.counts}
                onSubmitted={advance}
              />
            </>
          )}

          {item.kind === "close" && (() => {
            const ticked = item.phase.steps.every((s) => day.checks[s.id]);
            const reported = !!day.submissions?.[item.phase.id];
            const ready = ticked && reported;
            return (
              <>
                <div className="font-display text-xl md:text-2xl font-semibold leading-snug">
                  Close {item.phase.codename} — {item.phase.name}
                </div>
                <p className="text-sm text-muted-foreground">
                  {ready
                    ? "Everything in this phase is ticked and reported. Lock it and move on."
                    : `Still pending: ${!ticked ? "checklist steps" : ""}${!ticked && !reported ? " and " : ""}${!reported ? "the phase report" : ""}.`}
                </p>
                <Button
                  disabled={!ready}
                  onClick={() => { completePhase(actorId, role.id, item.phase.id); advance(); }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Close {item.phase.codename}
                </Button>
              </>
            );
          })()}

          {/* live counters for the phase checkpoint */}
          {item.phase.checkpoint && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Log your units · checkpoint {item.phase.due}
              </div>
              {role.targets.map((t) => {
                const have = day.counts[t.id] || 0;
                const want = targetAt(t, item.phase.checkpoint!);
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">{t.label}</span>
                    <span className="font-mono text-sm">{have}/{want}</span>
                    <Badge variant="outline" className={BAND_META[bandFor(pct(have, want))].tone}>{pct(have, want)}%</Badge>
                    <Button size="sm" variant="outline" onClick={() => bump(actorId, role.id, t.id, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" onClick={() => bump(actorId, role.id, t.id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => go(-1)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto" disabled={idx >= items.length - 1} onClick={() => go(1)}>
              Skip for now <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Progress value={(doneTicks / totalTicks) * 100} className="flex-1" />
        <span className="text-xs font-mono text-muted-foreground">{doneTicks}/{totalTicks} done</span>
      </div>
    </div>
  );
}