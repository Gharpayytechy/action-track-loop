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
  getPrevDayRecord, type DynDayRecord,
} from "@/lib/execution/dyn-store";
import {
  Settings2, Sparkles, ChevronDown, Check, Clock, Circle, Save,
  TrendingUp, TrendingDown, Minus, Flame, ArrowRight,
} from "lucide-react";
import { fmtDuration, totalActiveMs } from "@/lib/execution/insights";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Flow · Execution OS — Gharpayy" },
      { name: "description", content: "A calm, guided day. Beat yesterday, one block at a time — proofs, updates, and WhatsApp-ready messages built in." },
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
  const push = (id: string, title: string, hint: string, entry: { stage: StageDef; flatIdx: number }) => {
    if (!map.has(id)) { map.set(id, { id, title, hint, stages: [] }); order.push(id); }
    map.get(id)!.stages.push(entry);
  };
  stages.forEach((stage, flatIdx) => {
    const id = stage.id;
    const entry = { stage, flatIdx };
    if (id === "login" || id === "mission") push("kickoff", "Morning kickoff", "Show up, lock the target, commit the plan", entry);
    else if (id.startsWith("c1_") || id === "break1") push("morning", "Morning work block", "Prep 30 checks · run calls · close BBD & quotes · recharge", entry);
    else if (id.startsWith("c2_") || id === "break2" || id === "pre_break" || id === "resume") push("afternoon", "Afternoon work block", "Second block — repeat with sharper intent, then recharge", entry);
    else if (id.startsWith("c3_")) push("evening", "Evening push", "Last honest push for BBD and quotations", entry);
    else if (id === "impact") push("wrap", "Day wrap", "Reflect, send EOD on WhatsApp, log out clean", entry);
    else push("more", "Extra tasks", "Additional items", entry);
  });
  return order.map((k) => map.get(k)!);
}

// ---- KPI + timing helpers for yesterday-vs-today ----
const KPI_KEYS = ["bbd", "quotations", "cold_calls", "connected_calls", "checks_drafted", "doors_initiated"] as const;
type KpiKey = typeof KPI_KEYS[number];
const KPI_LABEL: Record<KpiKey, string> = {
  bbd: "BBD", quotations: "Quotes", cold_calls: "Cold calls",
  connected_calls: "Connected", checks_drafted: "Checks", doors_initiated: "Doors",
};

function sumKpis(rec?: DynDayRecord): Record<KpiKey, number> {
  const out = Object.fromEntries(KPI_KEYS.map((k) => [k, 0])) as Record<KpiKey, number>;
  if (!rec) return out;
  for (const sub of Object.values(rec.submissions)) {
    for (const k of KPI_KEYS) {
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
  if (!yesterdayMs) return { text: "no baseline", tone: "flat" };
  if (!todayMs) return { text: `yesterday took ${fmtDuration(yesterdayMs)}`, tone: "flat" };
  const diff = todayMs - yesterdayMs;
  if (Math.abs(diff) < 60_000) return { text: "same pace as yesterday", tone: "flat" };
  const faster = diff < 0;
  return {
    text: `${fmtDuration(Math.abs(diff))} ${faster ? "faster" : "slower"} than yesterday`,
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

  const todayKpis = sumKpis(rec);
  const yKpis = sumKpis(yRec);

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

  // "2x" performance nudge — pick the single most meaningful KPI to beat
  const topBeat = useMemo(() => {
    let best: { key: KpiKey; y: number } | null = null;
    for (const k of KPI_KEYS) if (yKpis[k] > (best?.y ?? -1)) best = { key: k, y: yKpis[k] };
    return best;
  }, [yKpis]);
  const beatTarget = topBeat ? Math.max(topBeat.y + 1, Math.ceil(topBeat.y * 1.2)) : 0;

  const timePace = fmtDeltaTime(activeMs, yActiveMs);
  const resumeLabel = rec.drafts && activeStage && rec.drafts[activeStage.id] ? "Resume where you left off" : done === 0 ? "Start today's flow" : "Continue where you are";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Hero — greeting + yesterday-vs-today */}
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
              {done >= total
                ? "You closed every block today. Big day. 🏁"
                : yRec
                  ? `Yesterday you shipped ${yKpis.bbd} BBD and ${yKpis.quotations} quotes in ${fmtDuration(yActiveMs)}. Today's job — beat it.`
                  : "Fresh baseline day. Whatever you ship today becomes tomorrow's line to beat."}
            </p>
          </div>
          <Link to="/admin/playbooks" className="inline-flex items-center gap-1 text-xs h-9 px-3 rounded-md border hover:bg-secondary shrink-0">
            <Settings2 className="h-3.5 w-3.5" /> Manage
          </Link>
        </div>

        {/* Yesterday-vs-today scoreboard */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Beat yesterday</div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">{pct}% of today's blocks done</Badge>
          </div>

          {/* KPI comparison strip */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {KPI_KEYS.map((k) => {
              const t = todayKpis[k], y = yKpis[k];
              const d = deltaLabel(t, y, true);
              return (
                <div key={k} className="p-2 rounded-md bg-background/50 border border-border/40">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{KPI_LABEL[k]}</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-display text-lg font-semibold tabular-nums">{t}</span>
                    <span className="text-[10px] text-muted-foreground">/{y}</span>
                  </div>
                  <div className={`text-[9px] font-mono mt-0.5 inline-flex items-center gap-0.5 ${toneClass(d.tone)}`}>
                    <d.icon className="h-2.5 w-2.5" /> {d.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress + time pace */}
          <Progress value={pct} className="h-1.5 mt-4" />
          <div className="flex items-center justify-between gap-3 flex-wrap mt-2 text-[11px]">
            <div className="text-muted-foreground">
              <span className="font-mono">{fmtDuration(activeMs) || "0m"}</span> on flow today
              {" · "}
              <span className={toneClass(timePace.tone)}>{timePace.text}</span>
            </div>
            {topBeat && (
              <div className="text-muted-foreground">
                Stretch target: <span className="text-foreground font-medium">{beatTarget} {KPI_LABEL[topBeat.key]}</span>
                <span className="ml-1 text-muted-foreground">(yesterday {topBeat.y})</span>
              </div>
            )}
          </div>
        </Card>

        {/* Resume / next action hero */}
        {done < total && activePhase && activeStage && (
          <Card className="p-4 border-primary/30 bg-primary/[0.03]">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary">{resumeLabel}</div>
                <div className="font-display font-semibold text-base mt-0.5 truncate">
                  {activePhase.title} · {activeStage.label.replace(/^\s*\d+\s*[·.\-]\s*/, "")}
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
                Jump in <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
                    {draftCount > 0 && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-600 inline-flex items-center gap-1">
                        <Save className="h-3 w-3" /> {draftCount} saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.hint}</p>
                  {/* Yesterday comment */}
                  {yRec && (yDur > 0 || tDur > 0) && (
                    <div className={`text-[11px] mt-1 inline-flex items-center gap-1 ${toneClass(pace.tone)}`}>
                      {pace.tone === "up" ? <TrendingUp className="h-3 w-3" /> : pace.tone === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {st === "done"
                        ? `Closed in ${fmtDuration(tDur)} · ${pace.text}`
                        : yDur > 0
                          ? `Yesterday you spent ${fmtDuration(yDur)} here — can you shave it?`
                          : pace.text}
                    </div>
                  )}
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
            <p className="text-sm text-muted-foreground mt-1">
              {fmtDuration(activeMs)} on flow · {todayKpis.bbd} BBD · {todayKpis.quotations} quotes
              {yRec && ` · ${fmtDeltaTime(activeMs, yActiveMs).text}`}
            </p>
            <Link to="/admin/ops" className="mt-4 inline-block"><Button variant="outline">View in Ops Dashboard</Button></Link>
          </Card>
        )}
      </div>
    </div>
  );
}
