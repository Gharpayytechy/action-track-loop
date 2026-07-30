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
  getPrevDayRecord, getDay, type DynDayRecord,
} from "@/lib/execution/dyn-store";
import { todayKey } from "@/lib/attendance-store";
import { getField } from "@/lib/execution/field-library";
import { WhatsAppCopyBlock } from "@/components/execution/WhatsAppCopyBlock";
import { prettyStageLabel } from "@/components/execution/StageRenderer";
import {
  Settings2, Sparkles, ChevronDown, Check, Clock, Circle, Save,
  TrendingUp, TrendingDown, Minus, Flame, ArrowRight, CalendarDays, ArrowLeft, Info,
} from "lucide-react";
import { fmtDuration, totalActiveMs } from "@/lib/execution/insights";
import {
  getKpiKeys, getPhaseCopy, subscribeDailyCfg, dailyCfgVersion,
} from "@/lib/execution/daily-config";
import {
  composePhaseMessage, isPhaseSent, markPhaseSent, phaseSentAt,
  subscribePhaseSent, phaseSentVersion,
} from "@/lib/execution/phase-message";


export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Flow · Execution OS" },
      { name: "description", content: "Structured daily workflow with proofs, updates, and WhatsApp-ready messages built in." },
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

// ---- Phase grouping (business-friendly names, no "cycle" jargon) ----
interface Phase {
  id: string;
  title: string;
  hint: string;
  stages: { stage: StageDef; flatIdx: number }[];
}

function buildPhases(stages: StageDef[]): Phase[] {
  const map = new Map<string, Phase>();
  const order: string[] = [];
  const push = (id: string, entry: { stage: StageDef; flatIdx: number }) => {
    if (!map.has(id)) {
      const copy = getPhaseCopy(id);
      map.set(id, { id, title: copy.title, hint: copy.hint, stages: [] });
      order.push(id);
    }
    map.get(id)!.stages.push(entry);
  };
  stages.forEach((stage, flatIdx) => {
    const id = stage.id;
    const entry = { stage, flatIdx };
    // 4-step grouping: Morning · Midday · Evening · EOD.
    if (id === "login" || id === "mission" || id === "c1_draft" || id === "c1_calls" || id === "c1_outcome") push("morning", entry);
    else if (id === "pre_break" || id === "break1" || id === "resume") push("midday", entry);
    else if (id === "c2_draft" || id === "c2_calls" || id === "c2_outcome" || id === "break2" || id.startsWith("c3_")) push("evening", entry);
    else if (id === "impact") push("eod", entry);
    else push("more", entry);
  });
  return order.map((k) => map.get(k)!);
}

// ---- KPI + timing helpers (KPI list is admin-configurable) ----
const KPI_LABEL: Record<string, string> = {
  bbd: "BBD",
  quotations: "Quotes",
  cold_calls: "Calls placed",
  connected_calls: "Connected",
  checks_drafted: "Checks",
  doors_initiated: "Doors",
  calls: "Calls",
  connected: "Connected",
  tours_sched: "Tours planned",
  tours_done: "Tours done",
  prebook: "Prebooks",
  movein: "Move-ins",
  deals: "Deals",
  revenue: "Revenue",
};
function kpiLabel(k: string): string { return KPI_LABEL[k] || k.replace(/_/g, " "); }

function sumKpis(rec: DynDayRecord | undefined, keys: string[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  if (!rec) return out;
  for (const sub of Object.values(rec.submissions)) {
    for (const k of keys) {
      const v = Number(sub.values[k]);
      if (!isNaN(v)) out[k] += v;
    }
  }
  return out;
}

function phaseDurationMs(rec: DynDayRecord | undefined, phase: Phase, allStages: StageDef[]): number {
  if (!rec) return 0;
  let total = 0;
  for (const { stage, flatIdx } of phase.stages) {
    const sub = rec.submissions[stage.id];
    if (!sub?.ts) continue;
    const prevStage = flatIdx > 0 ? allStages[flatIdx - 1] : undefined;
    const prevTs = prevStage ? rec.submissions[prevStage.id]?.ts : rec.startedAt;
    if (prevTs && sub.ts > prevTs) total += sub.ts - prevTs;
  }
  return total;
}

function deltaLabel(today: number, yesterday: number, higherIsBetter: boolean): { text: string; tone: "up" | "down" | "flat"; icon: typeof TrendingUp } {
  if (!yesterday && !today) return { text: "—", tone: "flat", icon: Minus };
  const diff = today - yesterday;
  if (diff === 0) return { text: "same as yesterday", tone: "flat", icon: Minus };
  const better = higherIsBetter ? diff > 0 : diff < 0;
  const abs = Math.abs(diff);
  return {
    text: `${diff > 0 ? "+" : "−"}${abs} vs yesterday`,
    tone: better ? "up" : "down",
    icon: better ? TrendingUp : TrendingDown,
  };
}

function fmtDeltaTime(todayMs: number, yesterdayMs: number): { text: string; tone: "up" | "down" | "flat" } {
  if (!yesterdayMs) return { text: "No comparison available.", tone: "flat" };
  if (!todayMs) return { text: `Previous day took ${fmtDuration(yesterdayMs)}.`, tone: "flat" };
  const diff = todayMs - yesterdayMs;
  if (Math.abs(diff) < 60_000) return { text: "Pace matches the previous day.", tone: "flat" };
  const faster = diff < 0;
  return {
    text: `${fmtDuration(Math.abs(diff))} ${faster ? "ahead of" : "behind"} the previous day.`,
    tone: faster ? "up" : "down",
  };
}

function toneClass(tone: "up" | "down" | "flat"): string {
  if (tone === "up") return "text-emerald-600";
  if (tone === "down") return "text-rose-600";
  return "text-muted-foreground";
}

function DailyPage() {
  const { actor } = useAttendanceState();
  useSyncExternalStore(subscribeDyn, dynVersion, () => 0);
  useSyncExternalStore(subscribePlaybooks, playbooksVersion, () => 0);
  useSyncExternalStore(subscribeDailyCfg, dailyCfgVersion, () => 0);

  const today = todayKey();
  const [viewDate, setViewDate] = useState<string>(today);
  const [showHistory, setShowHistory] = useState<boolean>(false);

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

  // History mode — read-only view of a past day
  if (viewDate !== today) {
    return (
      <HistoryView
        employeeId={actor.id}
        employeeName={actor.name}
        date={viewDate}
        onChangeDate={setViewDate}
        onBackToToday={() => setViewDate(today)}
      />
    );
  }

  const rec = getOrCreateDay(actor.id, playbook.id);
  const yRec = getPrevDayRecord(actor.id);
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
  const yActiveMs = yRec ? totalActiveMs(yRec) : 0;

  const kpiKeys = getKpiKeys();
  const todayKpis = sumKpis(rec, kpiKeys);
  const yKpis = sumKpis(yRec, kpiKeys);


  const submittedCount = Object.keys(rec.submissions).length;
  const hasActivityToday = submittedCount > 0 || (rec.drafts && Object.keys(rec.drafts).length > 0);

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
  const activePhase = phases.find((p) => p.id === activePhaseId);
  const activeStage = stages[rec.stageIdx];

  const [openIds, setOpenIds] = useState<Set<string>>(new Set([activePhaseId!]));
  const isOpen = (id: string) => openIds.has(id) || id === activePhaseId;
  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resumeLabel = rec.drafts && activeStage && rec.drafts[activeStage.id]
    ? "Resume your work"
    : done === 0
      ? "Begin today's flow"
      : "Continue where you left off";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Hero: greeting, playbook, progress. History hidden behind info toggle. */}
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {playbook.name}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mt-1">
              {greet()}, {actor.name.split(" ")[0]}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              {done >= total
                ? "All phases are complete for today."
                : done === 0
                  ? "Your workflow is ready. Open the first phase to begin."
                  : `You are ${pct}% through today's workflow. Continue with the next phase when ready.`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="inline-flex items-center gap-1 text-xs h-9 w-9 rounded-md border hover:bg-secondary justify-center"
              aria-label="Browse previous days"
              title="Browse previous days"
            >
              <Info className="h-4 w-4" />
            </button>
            <Link to="/admin/playbooks" className="inline-flex items-center gap-1 text-xs h-9 px-3 rounded-md border hover:bg-secondary">
              <Settings2 className="h-3.5 w-3.5" /> Manage
            </Link>
          </div>
        </div>

        {showHistory && (
          <DateStrip employeeId={actor.id} viewDate={viewDate} onChange={setViewDate} today={today} />
        )}

        {/* Progress card. Today's totals appear only after real activity. */}
        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Progress</div>
            <Badge variant="outline" className="font-mono text-[10px]">
              {done} of {total} phases complete
            </Badge>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className="flex items-center justify-between gap-3 flex-wrap mt-2 text-[11px] text-muted-foreground">
            <div><span className="font-mono">{fmtDuration(activeMs) || "0m"}</span> logged today</div>
            <div>{pct}%</div>
          </div>

          {hasActivityToday && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4 pt-4 border-t border-border/40">
              {kpiKeys.map((k) => (
                <div key={k} className="p-2 rounded-md bg-muted/30">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground truncate">{kpiLabel(k)}</div>
                  <div className="font-display text-lg font-semibold tabular-nums mt-0.5">{todayKpis[k] || 0}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Resume / next-action card */}
        {done < total && activePhase && activeStage && (
          <Card className="p-4 border-primary/30 bg-primary/[0.03]">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary">{resumeLabel}</div>
                <div className="font-display font-semibold text-base mt-0.5 truncate">
                  {activePhase.title}: {activeStage.label.replace(/^\s*\d+\s*[·.\-]\s*/, "")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{activePhase.hint}</div>
              </div>
              <Button
                size="sm"
                className="h-9"
                onClick={() => {
                  setOpenIds(new Set([activePhaseId!]));
                  setTimeout(() => document.getElementById(`phase-${activePhaseId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                }}
              >
                Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        )}
      </header>


      {/* Phases — vertical connector for continuity */}
      <div className="relative space-y-3">
        <div className="absolute left-[27px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/30 via-border to-border/40" aria-hidden />
        {phases.map((phase, phaseIdx) => {
          const st = phaseStatus(phase);
          const open = isOpen(phase.id);
          const totalT = phase.stages.length;
          const doneCount = phase.stages.filter((s) => s.flatIdx < rec.stageIdx).length;
          const draftCount = phase.stages.filter((s) => rec.drafts?.[s.stage.id]).length;
          const yDur = phaseDurationMs(yRec, phase, stages);
          const tDur = phaseDurationMs(rec, phase, stages);
          const pace = fmtDeltaTime(tDur, yDur);
          const isNextUp = st === "active";
          return (
            <Card
              key={phase.id}
              id={`phase-${phase.id}`}
              className={`overflow-hidden transition-all ml-0 ${
                st === "active" ? "border-primary/40 shadow-md ring-1 ring-primary/10" :
                st === "done" ? "border-emerald-500/30 bg-emerald-500/[0.02]" :
                "border-border/60 opacity-95"
              }`}
            >
              <button
                onClick={() => toggle(phase.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 relative z-10 ${
                  st === "done" ? "bg-emerald-500 text-white" :
                  st === "active" ? "bg-primary text-primary-foreground shadow-sm" :
                  "bg-background border border-border text-muted-foreground"
                }`}>
                  {st === "done" ? <Check className="h-4 w-4" /> : st === "active" ? <Clock className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-base leading-tight">{phase.title}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      {doneCount}/{totalT} tasks
                    </span>
                    {isNextUp && <span className="text-[10px] font-mono uppercase tracking-widest text-primary">· up next</span>}
                    {st === "done" && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 inline-flex items-center gap-1">
                        <Check className="h-3 w-3" /> Win logged
                      </span>
                    )}
                    {draftCount > 0 && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-600 inline-flex items-center gap-1">
                        <Save className="h-3 w-3" /> {draftCount} saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.hint}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && yRec && tDur > 0 && (
                <div className={`mx-4 mb-2 -mt-1 text-[11px] inline-flex items-center gap-1 ${toneClass(pace.tone)}`}>
                  {pace.tone === "up" ? <TrendingUp className="h-3 w-3" /> : pace.tone === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {st === "done"
                    ? `Completed in ${fmtDuration(tDur)}. ${pace.text}`
                    : `Time in this phase so far: ${fmtDuration(tDur)}. ${pace.text}`}
                </div>
              )}



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

                  {st === "done" && (
                    <PhaseWrap
                      rec={rec}
                      phase={phase}
                      employeeId={actor.id}
                      employeeName={actor.name}
                      employeeRole={actor.role}
                      nextPhaseId={phases[phaseIdx + 1]?.id}
                      nextPhaseTitle={phases[phaseIdx + 1]?.title}
                      onOpenNext={(id) => {
                        setOpenIds(new Set([id]));
                        setTimeout(() => document.getElementById(`phase-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                      }}
                    />
                  )}
                </div>
              )}

            </Card>
          );
        })}

        {rec.stageIdx >= stages.length && (
          <Card className="p-6 text-center bg-emerald-500/5 border-emerald-500/40">
            <h2 className="font-display text-2xl font-semibold">All phases complete</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {fmtDuration(activeMs)} logged. {todayKpis.bbd || 0} BBD. {todayKpis.quotations || 0} quotations.
              {yRec ? ` ${fmtDeltaTime(activeMs, yActiveMs).text}` : ""}
            </p>
            <Link to="/admin/ops" className="mt-4 inline-block"><Button variant="outline">Open Ops Dashboard</Button></Link>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------- Phase wrap-up: one message the employee sends, then the next phase opens ----------
function PhaseWrap({
  rec, phase, employeeId, employeeName, employeeRole, nextPhaseId, nextPhaseTitle, onOpenNext,
}: {
  rec: DynDayRecord;
  phase: Phase;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  nextPhaseId?: string;
  nextPhaseTitle?: string;
  onOpenNext: (id: string) => void;
}) {
  useSyncExternalStore(subscribePhaseSent, phaseSentVersion, () => 0);
  const sent = isPhaseSent(employeeId, rec.date, phase.id);
  const message = useMemo(
    () => composePhaseMessage(rec, {
      name: employeeName,
      role: employeeRole,
      date: rec.date,
      phaseId: phase.id,
      phaseTitle: phase.title,
      stageIds: phase.stages.map((s) => s.stage.id),
    }),
    [rec, phase, employeeName, employeeRole],
  );

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 mt-1">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500 text-white grid place-items-center shrink-0">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="font-display font-semibold text-base leading-tight">{phase.title} complete</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sent
              ? "Update shared with the team. You can copy it again if needed."
              : "Review your update below, send it to the team group, then continue."}
          </p>
        </div>
      </div>

      <WhatsAppCopyBlock text={message} label="Copy update" />

      <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
        <div className="text-[11px] text-muted-foreground">
          {sent
            ? `Marked as sent at ${new Date(phaseSentAt(employeeId, rec.date, phase.id) || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`
            : "Written in your words from what you filled in this phase."}
        </div>
        {!sent ? (
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              markPhaseSent(employeeId, rec.date, phase.id);
              if (nextPhaseId) onOpenNext(nextPhaseId);
            }}
          >
            Mark as sent{nextPhaseTitle ? ` and open ${nextPhaseTitle}` : ""} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : nextPhaseId ? (
          <Button size="sm" variant="outline" className="h-9" onClick={() => onOpenNext(nextPhaseId)}>
            Go to {nextPhaseTitle} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Date strip: browse recent days ----------
function shortDate(d: string): string {
  const dt = new Date(d + "T00:00:00");

  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function DateStrip({ employeeId, viewDate, onChange, today }: { employeeId: string; viewDate: string; onChange: (d: string) => void; today: string }) {
  const days = useMemo(() => {
    const arr: string[] = [];
    const t = new Date(today + "T00:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(t); d.setDate(t.getDate() - i);
      arr.push(d.toISOString().slice(0, 10));
    }
    return arr;
  }, [today]);
  const hasData = (d: string) => !!getDay(employeeId, d);
  return (
    <Card className="p-2 flex items-center gap-2 overflow-x-auto">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-1 shrink-0">
        <CalendarDays className="h-3 w-3" /> Browse
      </div>
      {days.map((d) => {
        const isToday = d === today;
        const active = d === viewDate;
        const dot = hasData(d);
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs border transition-colors ${
              active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary border-border"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{isToday ? "Today" : shortDate(d)}</span>
              {dot && !active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </div>
          </button>
        );
      })}
      <input
        type="date"
        value={viewDate}
        max={today}
        onChange={(e) => onChange(e.target.value)}
        className="ml-auto h-8 rounded border bg-background px-2 text-xs shrink-0"
      />
    </Card>
  );
}

// ---------- Read-only history view for a past day ----------
function HistoryView({
  employeeId, employeeName, date, onChangeDate, onBackToToday,
}: {
  employeeId: string; employeeName: string; date: string;
  onChangeDate: (d: string) => void; onBackToToday: () => void;
}) {
  const today = todayKey();
  const rec = getDay(employeeId, date);
  const kpiSum = useMemo(() => {
    if (!rec) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const s of Object.values(rec.submissions)) {
      for (const [k, v] of Object.entries(s.values)) {
        if (typeof v === "number") out[k] = (out[k] || 0) + v;
      }
    }
    return out;
  }, [rec]);
  const active = totalActiveMs(rec || ({} as DynDayRecord));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      <DateStrip employeeId={employeeId} viewDate={date} onChange={onChangeDate} today={today} />
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-primary" /> History · {shortDate(date)}
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{employeeName}'s day</h1>
          <Button variant="ghost" size="sm" onClick={onBackToToday} className="h-8">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to today
          </Button>
        </div>
      </header>

      {!rec ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nothing was logged on {shortDate(date)}.
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Day snapshot</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Stat label="Steps done" value={`${Object.keys(rec.submissions).length}`} />
              <Stat label="Time on flow" value={fmtDuration(active)} />
              <Stat label="BBD" value={String(kpiSum.bbd ?? 0)} />
              <Stat label="Quotes" value={String(kpiSum.quotations ?? 0)} />
              <Stat label="Cold calls" value={String(kpiSum.cold_calls ?? 0)} />
              <Stat label="Connected" value={String(kpiSum.connected_calls ?? 0)} />
              <Stat label="Doors init." value={String(kpiSum.doors_initiated ?? 0)} />
              <Stat label="Checks" value={String(kpiSum.checks_drafted ?? 0)} />
            </div>
          </Card>

          <div className="space-y-3">
            {Object.values(rec.submissions)
              .sort((a, b) => a.ts - b.ts)
              .map((sub) => (
                <Card key={sub.stageId} className="p-4 border-emerald-500/25 bg-emerald-500/[0.02]">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/40 text-emerald-700">Done</Badge>
                    <h3 className="font-medium text-sm">{prettyStageLabel(sub.stageId)}</h3>
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                      {new Date(sub.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {Object.keys(sub.values).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {Object.entries(sub.values).map(([k, v]) => {
                        const f = getField(k);
                        return (
                          <div key={k} className="p-2 rounded bg-muted/40">
                            <div className="text-[10px] font-mono uppercase text-muted-foreground truncate">{f?.label || k}</div>
                            <div className="truncate">{String(v)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {sub.waMessage && <div className="mt-2"><WhatsAppCopyBlock text={sub.waMessage} /></div>}
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-background/50 border border-border/40">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

// Weekly ledger helper — sums KPIs from Mon..Sun for this week and last week.
function weekBounds(anchorISO: string, offsetWeeks: number): { from: string; to: string } {
  const d = new Date(anchorISO + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // Mon = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day - offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

function buildWeeklyLedger(employeeId: string, today: string, kpiKeys: string[]): {
  thisWeek: Record<string, number>;
  lastWeek: Record<string, number>;
  hasAny: boolean;
} {
  const acc = (from: string, to: string): Record<string, number> => {
    const out: Record<string, number> = Object.fromEntries(kpiKeys.map((k) => [k, 0]));
    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const rec = getDay(employeeId, iso);
      if (!rec) continue;
      for (const sub of Object.values(rec.submissions)) {
        for (const k of kpiKeys) {
          const v = Number(sub.values[k]);
          if (!isNaN(v)) out[k] += v;
        }
      }
    }
    return out;
  };
  const tw = weekBounds(today, 0);
  const lw = weekBounds(today, 1);
  const thisWeek = acc(tw.from, tw.to);
  const lastWeek = acc(lw.from, lw.to);
  const hasAny = Object.values(thisWeek).some((v) => v > 0) || Object.values(lastWeek).some((v) => v > 0);
  return { thisWeek, lastWeek, hasAny };
}
