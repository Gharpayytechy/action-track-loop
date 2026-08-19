// "WhatsApp PHASES" — the whole daily flow (every phase, every step, every report)
// rendered as a WhatsApp-style chat thread instead of stacked cards.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PhaseReportForm } from "@/components/execution/PhaseReportForm";
import { WhatsAppCopyBlock } from "@/components/execution/WhatsAppCopyBlock";
import {
  BAND_META, bandFor, targetAt, type CoreRole,
} from "@/lib/execution/core-roles";
import type { FlowPhase, PhaseId } from "@/lib/execution/core-tasks";
import { toggleStep, startPhase, completePhase, bump, type CoreDay } from "@/lib/execution/core-progress";
import {
  Check, CheckCheck, Circle, Clock, Lock, Minus, Plus, PlayCircle, Zap, ShieldAlert,
} from "lucide-react";

function pct(have: number, want: number) {
  if (want <= 0) return 100;
  return Math.round((have / want) * 100);
}

function chatTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function phaseUpdateText(role: CoreRole, phase: FlowPhase, day: CoreDay, counts: Record<string, number>) {
  const done = phase.steps.filter((s) => day.checks[s.id]);
  const lines = [
    `*${role.name} · ${phase.codename}*`,
    `${phase.window} · due ${phase.due}`,
    "",
    `Steps done: ${done.length}/${phase.steps.length}`,
    ...done.map((s) => `✅ ${s.label}`),
    ...phase.steps.filter((s) => !day.checks[s.id]).map((s) => `⬜ ${s.label}`),
  ];
  if (phase.checkpoint) {
    lines.push("", "*Numbers at this checkpoint*");
    for (const t of role.targets) {
      const have = counts[t.id] || 0;
      const want = targetAt(t, phase.checkpoint);
      lines.push(`${t.label}: ${have}/${want} (${pct(have, want)}%)`);
    }
  }
  const sub = day.submissions?.[phase.id]?.values;
  if (sub) {
    lines.push("", "*Report filed*");
    for (const f of phase.report) {
      const v = sub[f.id];
      if (v !== undefined && v !== null && String(v).trim() !== "") lines.push(`${f.label}: ${v}`);
    }
  }
  return lines.join("\n");
}

/* ---------------- bubbles ---------------- */

function DayChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center my-3">
      <span className="wa-chip px-3 py-1 text-[10px] font-mono uppercase tracking-widest">{children}</span>
    </div>
  );
}

function In({ children, time, className = "" }: { children: React.ReactNode; time?: string; className?: string }) {
  return (
    <div className="flex justify-start">
      <div className={`wa-bubble-in wa-pop max-w-[92%] md:max-w-[75%] ml-2 px-3 py-2 text-sm ${className}`}>
        {children}
        {time && <div className="text-[10px] wa-meta text-right mt-1">{time}</div>}
      </div>
    </div>
  );
}

function Out({ children, time, read }: { children: React.ReactNode; time?: string; read?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="wa-bubble-out wa-pop max-w-[92%] md:max-w-[75%] mr-2 px-3 py-2 text-sm">
        {children}
        {time && (
          <div className="text-[10px] wa-meta text-right mt-1 flex items-center justify-end gap-1">
            {time}
            <CheckCheck className={`h-3 w-3 ${read ? "text-sky-500" : ""}`} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- one phase as a conversation ---------------- */

function PhaseThread({
  phase, index, role, day, actorId, counts, openByDefault,
}: {
  phase: FlowPhase; index: number; role: CoreRole; day: CoreDay;
  actorId: string; counts: Record<string, number>; openByDefault: boolean;
}) {
  const [open, setOpen] = useState(openByDefault);
  const done = phase.steps.filter((s) => day.checks[s.id]).length;
  const all = phase.steps.length;
  const ticked = done === all;
  const submission = day.submissions?.[phase.id];
  const complete = ticked && !!submission;
  const closed = !!day.phases[phase.id]?.doneAt;
  const started = !!day.phases[phase.id]?.startedAt;
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const overdue = !complete && nowMins > phase.dueMins;
  const time = chatTime(phase.dueMins);

  const cpTargets = phase.checkpoint
    ? role.targets.map((t) => ({ t, have: counts[t.id] || 0, want: targetAt(t, phase.checkpoint!) }))
    : [];

  return (
    <div className="space-y-2">
      <DayChip>
        {phase.codename} · {phase.window} · {done}/{all} ticked
        {closed ? " · closed" : overdue ? " · overdue" : ""}
      </DayChip>

      <In time={time}>
        <button onClick={() => setOpen((o) => !o)} className="text-left w-full">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-mono
              ${closed ? "bg-emerald-500/20 text-emerald-600" : overdue ? "bg-red-500/15 text-red-500" : "bg-black/5 dark:bg-white/10 wa-meta"}`}>
              {closed ? <Check className="h-3.5 w-3.5" /> : index}
            </span>
            <span className="font-semibold">{phase.name}</span>
          </div>
          <p className="mt-1.5 leading-relaxed">{phase.brief}</p>
          <span className="mt-1 inline-block text-[10px] font-mono uppercase tracking-widest wa-meta">
            {open ? "tap to collapse" : "tap to open this phase"}
          </span>
        </button>
      </In>

      {open && (
        <>
          {!started && (
            <Out>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startPhase(actorId, role.id, phase.id)}>
                <PlayCircle className="h-3.5 w-3.5 mr-1" /> Start {phase.codename}
              </Button>
            </Out>
          )}

          <In time={time}>
            <div className="text-[10px] font-mono uppercase tracking-widest wa-meta mb-1.5">Checklist · tap to tick</div>
            <div className="space-y-1.5">
              {phase.steps.map((s) => {
                const on = !!day.checks[s.id];
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStep(actorId, role.id, s.id)}
                    className={`w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors
                      ${on ? "bg-emerald-500/10" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                  >
                    {on
                      ? <Check className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                      : <Circle className="h-4 w-4 mt-0.5 wa-meta shrink-0" />}
                    <span className="min-w-0">
                      <span className={`block ${on ? "line-through wa-meta" : ""}`}>{s.label}</span>
                      {s.detail && <span className="block text-xs wa-meta mt-0.5">{s.detail}</span>}
                      {s.evidence && (
                        <span className="mt-1 inline-block text-[10px] font-mono uppercase tracking-widest text-emerald-600">
                          Evidence: {s.evidence}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </In>

          {cpTargets.length > 0 && (
            <In time={time}>
              <div className="text-[10px] font-mono uppercase tracking-widest wa-meta mb-1.5 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Checkpoint gate · {phase.due}
              </div>
              <div className="space-y-2">
                {cpTargets.map(({ t, have, want }) => (
                  <div key={t.id}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{t.label}</span>
                      <span className="font-mono">{have}/{want}</span>
                      <Badge variant="outline" className={BAND_META[bandFor(pct(have, want))].tone}>{pct(have, want)}%</Badge>
                    </div>
                    <Progress value={Math.min(100, pct(have, want))} className="mt-1 h-1.5" />
                    <div className="flex gap-1 mt-1.5">
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => bump(actorId, role.id, t.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => bump(actorId, role.id, t.id, 1)}>
                        <Plus className="h-3 w-3 mr-1" /> Log {t.label}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </In>
          )}

          <Out time={time} read={!!submission}>
            <div className="text-[10px] font-mono uppercase tracking-widest wa-meta mb-1.5">
              {submission ? "Report filed" : `Your ${phase.codename} report`}
            </div>
            <PhaseReportForm
              phase={phase}
              actorId={actorId}
              roleId={role.id}
              existing={submission?.values}
              submittedAt={submission?.ts}
              counts={counts}
            />
          </Out>

          <div className="px-2">
            <WhatsAppCopyBlock text={phaseUpdateText(role, phase, day, counts)} label={`Copy ${phase.codename} update`} />
          </div>

          <Out>
            <Button
              size="sm"
              disabled={!complete || closed}
              onClick={() => completePhase(actorId, role.id, phase.id)}
              className="h-7 text-xs"
            >
              {closed
                ? <><Check className="h-3.5 w-3.5 mr-1" /> Phase closed</>
                : complete
                  ? <><Check className="h-3.5 w-3.5 mr-1" /> Mark {phase.codename} complete</>
                  : !ticked
                    ? <><Lock className="h-3.5 w-3.5 mr-1" /> Tick all {all} steps</>
                    : <><Lock className="h-3.5 w-3.5 mr-1" /> Submit the report to close</>}
            </Button>
          </Out>
        </>
      )}
    </div>
  );
}

/* ---------------- the whole thread ---------------- */

export function WhatsAppPhases({
  role, phases, day, actorId, counts, nowPhase, headline,
}: {
  role: CoreRole;
  phases: FlowPhase[];
  day: CoreDay;
  actorId: string;
  counts: Record<string, number>;
  nowPhase: PhaseId;
  headline?: string;
}) {
  const allSteps = phases.flatMap((p) => p.steps);
  const doneSteps = allSteps.filter((s) => day.checks[s.id]).length;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
      <div className="wa-header px-3 py-2.5 flex items-center gap-3 sticky top-0 z-20">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white to-emerald-50 flex items-center justify-center shadow ring-1 ring-white/30 relative">
          <span className="text-[#075E54] font-display font-black text-[15px]">{role.name.slice(0, 1)}</span>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#25D366] ring-2 ring-[#075E54]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white leading-tight truncate">{role.name} · WhatsApp PHASES</p>
          <p className="text-[11px] text-emerald-200 leading-tight truncate flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
            {doneSteps}/{allSteps.length} steps ticked · {phases.length} phases today
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px] text-white border-white/30">
          <Clock className="h-3 w-3 mr-1" /> live
        </Badge>
      </div>

      <div className="wa-chat-bg px-2 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
        <DayChip>{today}</DayChip>
        {headline && <In time={chatTime(new Date().getHours() * 60 + new Date().getMinutes())}>{headline}</In>}
        {phases.map((p, i) => (
          <PhaseThread
            key={p.id}
            phase={p}
            index={i}
            role={role}
            day={day}
            actorId={actorId}
            counts={counts}
            openByDefault={p.id === nowPhase}
          />
        ))}
        <DayChip>End of today's phases</DayChip>
      </div>
    </div>
  );
}
