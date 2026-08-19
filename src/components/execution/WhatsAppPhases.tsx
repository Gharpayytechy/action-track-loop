// "WhatsApp PHASES" — the whole daily flow (every phase, every step, every
// report, every selfie proof) rendered as a high-energy WhatsApp-style thread.

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PhaseReportForm } from "@/components/execution/PhaseReportForm";
import { WhatsAppCopyBlock } from "@/components/execution/WhatsAppCopyBlock";
import { SelfieCapture } from "@/components/SelfieCapture";
import {
  BAND_META, bandFor, targetAt, type CoreRole,
} from "@/lib/execution/core-roles";
import { BREAKS, activeBreak, type FlowPhase, type PhaseId, type BreakMarker } from "@/lib/execution/core-tasks";
import {
  toggleStep, startPhase, completePhase, bump, saveSelfie, type CoreDay,
} from "@/lib/execution/core-progress";
import { selfieMomentsFor, SELFIE_MOMENTS, type SelfieMoment } from "@/lib/execution/phase-selfies";
import {
  Check, CheckCheck, Circle, Camera, Clock, Lock, Minus, Plus, PlayCircle, Zap,
  ShieldAlert, Flame, Trophy, ListChecks, AlarmClock, Sparkles, Coffee,
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

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
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
  const moments = selfieMomentsFor(phase.id);
  if (moments.length) {
    lines.push("", "*Selfie proof*");
    for (const m of moments) {
      const p = day.selfies?.[m.id];
      lines.push(`${p ? "📸" : "⬜"} ${m.title}${p ? ` · ${new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " · pending"}`);
    }
  }
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

/* ---------------- EOD wrap: done vs pending ---------------- */

interface WrapItem { label: string; sub?: string }

function buildWrap(role: CoreRole, phases: FlowPhase[], day: CoreDay, counts: Record<string, number>) {
  const done: WrapItem[] = [];
  const pending: WrapItem[] = [];

  for (const p of phases) {
    for (const s of p.steps) {
      (day.checks[s.id] ? done : pending).push({ label: s.label, sub: p.codename });
    }
    const filed = !!day.submissions?.[p.id];
    (filed ? done : pending).push({ label: `${p.codename} report`, sub: `due ${p.due}` });
  }

  for (const m of SELFIE_MOMENTS) {
    const proof = day.selfies?.[m.id];
    (proof ? done : pending).push({ label: m.title, sub: m.when });
  }

  const numbers = role.targets.map((t) => {
    const have = counts[t.id] || 0;
    const want = t.eod;
    return { label: t.label, have, want, pct: pct(have, want), gap: Math.max(0, want - have) };
  });
  for (const n of numbers) {
    if (n.gap === 0) done.push({ label: `${n.label}: ${n.have}/${n.want}`, sub: "target hit" });
    else pending.push({ label: `${n.label}: ${n.have}/${n.want}`, sub: `${n.gap} short` });
  }

  const total = done.length + pending.length;
  const score = total ? Math.round((done.length / total) * 100) : 0;
  return { done, pending, numbers, score };
}

function wrapText(role: CoreRole, wrap: ReturnType<typeof buildWrap>) {
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const lines = [
    `*EOD WRAP · ${role.name} · ${date}*`,
    `Day completion: ${wrap.score}%`,
    "",
    "*This is what's done*",
    ...wrap.done.map((d) => `✅ ${d.label}`),
    "",
    "*Yet this is what's pending*",
    ...(wrap.pending.length ? wrap.pending.map((d) => `⬜ ${d.label}${d.sub ? ` (${d.sub})` : ""}`) : ["Nothing pending. Day fully closed. 🔥"]),
  ];
  return lines.join("\n");
}

/* ---------------- bubbles ---------------- */

function DayChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center my-3">
      <span className="wa-chip px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-center">{children}</span>
    </div>
  );
}

function In({ children, time, className = "" }: { children: React.ReactNode; time?: string; className?: string }) {
  return (
    <div className="flex justify-start">
      <div className={`wa-bubble-in wa-pop max-w-[94%] md:max-w-[78%] ml-2 px-3 py-2 text-sm ${className}`}>
        {children}
        {time && <div className="text-[10px] wa-meta text-right mt-1">{time}</div>}
      </div>
    </div>
  );
}

function Out({ children, time, read }: { children: React.ReactNode; time?: string; read?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="wa-bubble-out wa-pop max-w-[94%] md:max-w-[78%] mr-2 px-3 py-2 text-sm">
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

/* ---------------- selfie gate ---------------- */

function SelfieGate({
  moment, day, actorId, roleId,
}: { moment: SelfieMoment; day: CoreDay; actorId: string; roleId: CoreRole["id"] }) {
  const [open, setOpen] = useState(false);
  const proof = day.selfies?.[moment.id];

  return (
    <>
      <In time={moment.when}>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-600 mb-1.5">
          <Camera className="h-3 w-3" /> Selfie moment · {moment.when}
        </div>
        <p className="font-semibold">{moment.title}</p>
        <p className="mt-1 leading-relaxed">{moment.cue}</p>
        <p className="text-xs wa-meta mt-1">{moment.why}</p>
        {proof ? (
          <div className="mt-2 flex items-center gap-2">
            <img src={proof.img} alt={`${moment.title} proof`} className="h-14 w-14 rounded-lg object-cover ring-2 ring-emerald-500/60" />
            <div className="text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <Check className="h-3.5 w-3.5" /> Stamped
              </span>
              <div className="wa-meta">{new Date(proof.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <button onClick={() => setOpen(true)} className="ml-auto text-[11px] underline wa-meta">retake</button>
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="wa-btn wa-glow mt-2 h-9 px-4 text-xs inline-flex items-center">
            <Camera className="h-4 w-4 mr-1.5" /> Take selfie
          </button>
        )}
      </In>

      <SelfieCapture
        open={open}
        title={moment.title}
        subtitle={moment.why}
        onClose={() => setOpen(false)}
        onCapture={(img) => { saveSelfie(actorId, roleId, moment.id, img); setOpen(false); }}
      />
    </>
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
  const moments = selfieMomentsFor(phase.id);
  const selfiesDone = moments.filter((m) => !m.required || day.selfies?.[m.id]).length === moments.length;
  const complete = ticked && !!submission && selfiesDone;
  const closed = !!day.phases[phase.id]?.doneAt;
  const started = !!day.phases[phase.id]?.startedAt;
  const overdue = !complete && nowMinutes() > phase.dueMins;
  const time = chatTime(phase.dueMins);

  const cpTargets = phase.checkpoint
    ? role.targets.map((t) => ({ t, have: counts[t.id] || 0, want: targetAt(t, phase.checkpoint!) }))
    : [];

  return (
    <div className="space-y-2" id={`wa-phase-${phase.id}`}>
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
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="wa-pill bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{done}/{all} steps</span>
            {moments.length > 0 && (
              <span className="wa-pill bg-sky-500/15 text-sky-700 dark:text-sky-300">
                {moments.filter((m) => day.selfies?.[m.id]).length}/{moments.length} selfie
              </span>
            )}
            <span className={`wa-pill ${submission ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
              {submission ? "report filed" : "report pending"}
            </span>
          </div>
          <span className="mt-1.5 inline-block text-[10px] font-mono uppercase tracking-widest wa-meta">
            {open ? "tap to collapse" : "tap to open this phase"}
          </span>
        </button>
      </In>

      {open && (
        <>
          {!started && (
            <Out>
              <button
                className="wa-btn h-9 px-4 text-xs inline-flex items-center"
                onClick={() => startPhase(actorId, role.id, phase.id)}
              >
                <PlayCircle className="h-4 w-4 mr-1.5" /> Start {phase.codename}
              </button>
            </Out>
          )}

          {moments.map((m) => (
            <SelfieGate key={m.id} moment={m} day={day} actorId={actorId} roleId={role.id} />
          ))}

          <In time={time}>
            <div className="text-[10px] font-mono uppercase tracking-widest wa-meta mb-1.5">Checklist · tap to tick</div>
            <div className="space-y-1.5">
              {phase.steps.map((s) => {
                const on = !!day.checks[s.id];
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStep(actorId, role.id, s.id)}
                    className={`w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors active:scale-[0.99]
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
                    <div className="flex gap-1.5 mt-2">
                      <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => bump(actorId, role.id, t.id, -1)}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <button className="wa-btn-ghost h-8 px-3 text-xs inline-flex items-center" onClick={() => bump(actorId, role.id, t.id, 1)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Log {t.label}
                      </button>
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
            <button
              disabled={!complete || closed}
              onClick={() => completePhase(actorId, role.id, phase.id)}
              className="wa-btn h-9 px-4 text-xs inline-flex items-center"
            >
              {closed
                ? <><Check className="h-4 w-4 mr-1.5" /> Phase closed</>
                : complete
                  ? <><Check className="h-4 w-4 mr-1.5" /> Mark {phase.codename} complete</>
                  : !ticked
                    ? <><Lock className="h-4 w-4 mr-1.5" /> Tick all {all} steps</>
                    : !selfiesDone
                      ? <><Camera className="h-4 w-4 mr-1.5" /> Selfie still pending</>
                      : <><Lock className="h-4 w-4 mr-1.5" /> Submit the report to close</>}
            </button>
          </Out>
        </>
      )}
    </div>
  );
}

/* ---------------- EOD wrap bubble ---------------- */

function WrapBubble({ role, wrap, auto }: { role: CoreRole; wrap: ReturnType<typeof buildWrap>; auto: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const doneList = showAll ? wrap.done : wrap.done.slice(0, 6);
  const pendList = showAll ? wrap.pending : wrap.pending.slice(0, 6);

  return (
    <>
      <DayChip>{auto ? "EOD wrap · auto-created" : "Live day wrap · updates as you tick"}</DayChip>
      <In>
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-emerald-500/15 grid place-items-center">
            <Trophy className="h-4 w-4 text-emerald-600" />
          </span>
          <div>
            <p className="font-semibold leading-tight">This is what's done. Yet this is what's pending.</p>
            <p className="text-[11px] wa-meta">{role.name} · day completion {wrap.score}%</p>
          </div>
        </div>

        <div className="wa-track h-2 mt-3 bg-black/10 dark:bg-white/10">
          <span style={{ width: `${wrap.score}%` }} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Done</div>
            <div className="font-display text-2xl font-bold tabular-nums">{wrap.done.length}</div>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300">Pending</div>
            <div className="font-display text-2xl font-bold tabular-nums">{wrap.pending.length}</div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 flex items-center gap-1">
            <ListChecks className="h-3 w-3" /> Done
          </div>
          {doneList.length === 0 && <p className="text-xs wa-meta">Nothing yet — tick your first step and this fills up.</p>}
          {doneList.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{d.label}{d.sub && <span className="wa-meta"> · {d.sub}</span>}</span>
            </div>
          ))}

          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-600 flex items-center gap-1 pt-2">
            <AlarmClock className="h-3 w-3" /> Pending
          </div>
          {pendList.length === 0 && <p className="text-xs wa-meta">Nothing pending. Day fully closed. 🔥</p>}
          {pendList.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <Circle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{d.label}{d.sub && <span className="wa-meta"> · {d.sub}</span>}</span>
            </div>
          ))}
        </div>

        {(wrap.done.length > 6 || wrap.pending.length > 6) && (
          <button onClick={() => setShowAll((s) => !s)} className="wa-btn-ghost mt-3 h-8 px-3 text-xs">
            {showAll ? "Show less" : `Show everything (${wrap.done.length + wrap.pending.length} items)`}
          </button>
        )}
      </In>
      <div className="px-2">
        <WhatsAppCopyBlock text={wrapText(role, wrap)} label="Copy EOD wrap" />
      </div>
    </>
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
  const stepPct = allSteps.length ? Math.round((doneSteps / allSteps.length) * 100) : 0;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });
  const wrap = useMemo(() => buildWrap(role, phases, day, counts), [role, phases, day, counts]);
  const selfieDone = SELFIE_MOMENTS.filter((m) => day.selfies?.[m.id]).length;
  const auto = nowPhase === "eod";
  const current = phases.find((p) => p.id === nowPhase);
  const mins = nowMinutes();
  const left = current ? current.dueMins - mins : 0;

  const jump = (id: string) =>
    document.getElementById(`wa-phase-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
      {/* Super-system header */}
      <div className="wa-hero px-3 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white to-emerald-50 flex items-center justify-center shadow ring-1 ring-white/30 relative shrink-0">
            <span className="text-[#075E54] font-display font-black text-base">{role.name.slice(0, 1)}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#25D366] ring-2 ring-[#075E54]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold leading-tight truncate">{role.name} · WhatsApp PHASES</p>
            <p className="text-[11px] text-emerald-100/90 leading-tight truncate flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
              {current ? `${current.codename} live` : "day closed"}
              {current && left > 0 ? ` · ${Math.floor(left / 60)}h ${left % 60}m to ${current.due}` : current ? ` · past ${current.due}` : ""}
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] text-white border-white/30 shrink-0">
            <Clock className="h-3 w-3 mr-1" /> live
          </Badge>
        </div>

        {/* Momentum bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-100/80">
            <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-300" /> momentum</span>
            <span>{stepPct}%</span>
          </div>
          <div className="wa-track h-2 mt-1"><span style={{ width: `${stepPct}%` }} /></div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mt-2.5">
          <HeroStat label="Done" value={`${doneSteps}`} />
          <HeroStat label="Pending" value={`${wrap.pending.length}`} />
          <HeroStat label="Selfies" value={`${selfieDone}/${SELFIE_MOMENTS.length}`} />
          <HeroStat label="Reports" value={`${phases.filter((p) => day.submissions?.[p.id]).length}/${phases.length}`} />
        </div>

        {/* Phase jump rail — thumb-friendly on mobile */}
        <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {phases.map((p) => {
            const closed = !!day.phases[p.id]?.doneAt;
            const isNow = p.id === nowPhase;
            return (
              <button
                key={p.id}
                onClick={() => jump(p.id)}
                className={`shrink-0 wa-pill border ${
                  closed ? "bg-emerald-400/25 border-emerald-200/50 text-emerald-50"
                    : isNow ? "bg-white/90 border-white text-[#075E54]"
                      : "bg-white/10 border-white/25 text-emerald-50/85"
                }`}
              >
                {closed ? "✓ " : isNow ? "▶ " : ""}{p.codename}
              </button>
            );
          })}
        </div>
      </div>

      <div className="wa-chat-bg px-2 py-4 space-y-3 max-h-[78vh] overflow-y-auto">
        <DayChip>{today}</DayChip>
        {headline && (
          <In time={chatTime(mins)}>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-600 mb-1">
              <Sparkles className="h-3 w-3" /> next best move
            </span>
            <p className="font-semibold leading-relaxed">{headline}</p>
          </In>
        )}
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
        <WrapBubble role={role} wrap={wrap} auto={auto} />
        <DayChip>End of today's phases</DayChip>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 border border-white/15 px-2 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-widest text-emerald-100/80 truncate">{label}</div>
      <div className="font-display text-base font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}
