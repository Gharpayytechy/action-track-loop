import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAttendanceState } from "@/hooks/useAttendance";
import {
  coreRole, BAND_META, bandFor, currentCheckpoint, CHECKPOINT_LABEL,
  targetAt, WORKING_DAYS_WEEK, WORKING_DAYS_MONTH, type CoreRole, type TargetLine,
} from "@/lib/execution/core-roles";
import { phasesFor, activePhaseId, type FlowPhase, type PhaseId } from "@/lib/execution/core-tasks";
import {
  getCoreDay, bump, addRecovery, history, subscribeCore, coreVersion,
  toggleStep, startPhase, completePhase, submitPhase, setCount, allToday, type CoreDay,
} from "@/lib/execution/core-progress";
import { seedCoreDemo, coreRoleOf } from "@/lib/execution/core-seed";
import { EMPLOYEES } from "@/data/seed";
import {
  ArrowRight, Minus, Plus, ShieldAlert, Target, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, Check, Circle, ChevronDown, PlayCircle, Lock, Users, Send, FileText,
} from "lucide-react";

export const Route = createFileRoute("/flow/$role")({
  loader: ({ params }) => {
    const r = coreRole(params.role);
    if (!r) throw notFound();
    return { name: r.name, result: r.finalResult };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Role flow unavailable" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${loaderData.name} · Daily Flow & Playbook` },
        { name: "description", content: loaderData.result },
        { property: "og:title", content: `${loaderData.name} · Daily Flow & Playbook` },
        { property: "og:description", content: loaderData.result },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: RoleFlowPage,
});

function useCoreVersion() {
  return useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
}
function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => { seedCoreDemo(); setH(true); }, []);
  return h;
}
function pctOf(have: number, want: number) {
  if (want <= 0) return 100;
  return Math.round((have / want) * 100);
}

function RoleFlowPage() {
  const { role: roleParam } = Route.useParams();
  const role = coreRole(roleParam)!;
  const { actor } = useAttendanceState();
  const hydrated = useHydrated();
  const v = useCoreVersion();
  const cp = currentCheckpoint();
  const phases = useMemo(() => phasesFor(role), [role]);

  const day = useMemo(
    () => { void v; return hydrated ? getCoreDay(actor.id, role.id) : ({ employeeId: actor.id, roleId: role.id, date: "", counts: {}, checks: {}, phases: {}, submissions: {}, recoveries: [] } as CoreDay); },
    [actor.id, role.id, v, hydrated],
  );
  const counts = day.counts;

  const lines = role.targets.map((t) => {
    const have = counts[t.id] || 0;
    const want = targetAt(t, cp);
    return { t, have, want, pct: pctOf(have, want), gap: Math.max(0, want - have) };
  });

  const overallPct = Math.round(lines.reduce((a, l) => a + Math.min(150, l.pct), 0) / lines.length);
  const gateFail = lines.some((l) => l.t.gate && cp === "eod" && l.have < l.t.eod);
  const band = bandFor(overallPct, cp === "eod", gateFail);
  const primaryGap = [...lines].sort((a, b) => b.gap - a.gap)[0];
  const needsRecovery = hydrated && overallPct < 90;

  const allSteps = phases.flatMap((p) => p.steps);
  const doneSteps = allSteps.filter((s) => day.checks[s.id]).length;
  const nowPhase = activePhaseId();
  const nextStep = useMemo(() => {
    const order: PhaseId[] = ["prep", "p1", "p2", "p3", "eod"];
    const from = order.indexOf(nowPhase);
    for (let i = 0; i < order.length; i++) {
      const idx = i <= from ? i : i; // scan in order, earliest incomplete first
      const p = phases[idx];
      const s = p?.steps.find((x) => !day.checks[x.id]);
      if (s) return { phase: p, step: s };
    }
    return null;
  }, [phases, day.checks, nowPhase]);

  const pendingReport = useMemo(
    () => phases.find((p) => p.steps.every((s) => day.checks[s.id]) && !day.submissions?.[p.id]) || null,
    [phases, day.checks, day.submissions],
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/flow" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Role flows</Link>
          <h1 className="font-display text-2xl font-semibold">{role.name}</h1>
          <p className="text-sm text-muted-foreground">{role.department} · {role.finalResult}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono"><Clock className="h-3 w-3 mr-1" />{CHECKPOINT_LABEL[cp]}</Badge>
          <Badge variant="outline" className={BAND_META[band].tone}>{BAND_META[band].label} · {overallPct}%</Badge>
          <Badge variant="outline">{doneSteps}/{allSteps.length} steps ticked</Badge>
        </div>
      </div>

      <Tabs defaultValue="flow">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="flow">Daily flow</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
          <TabsTrigger value="analytics">My analytics</TabsTrigger>
          <TabsTrigger value="team">Team analytics</TabsTrigger>
        </TabsList>

        {/* ---------------- DAILY FLOW ---------------- */}
        <TabsContent value="flow" className="space-y-5 mt-5">
          <Card className="p-5 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
              <Target className="h-3.5 w-3.5" /> This is what we are supposed to do next
            </div>
            {nextStep ? (
              <>
                <div className="mt-2 text-lg font-display font-semibold">{nextStep.step.label}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextStep.phase.name} · due {nextStep.phase.due}
                  {nextStep.step.detail ? ` — ${nextStep.step.detail}` : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" onClick={() => toggleStep(actor.id, role.id, nextStep.step.id)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> I did this
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startPhase(actor.id, role.id, nextStep.phase.id)}>
                    <PlayCircle className="h-3.5 w-3.5 mr-1" /> Start {nextStep.phase.name.split(" · ")[0]}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-2 text-lg font-display font-semibold">
                {pendingReport
                  ? `Every step is ticked — now submit the ${pendingReport.codename} report.`
                  : "Every step is ticked and every report is in."}
              </div>
            )}
            {nextStep && pendingReport && (
              <p className="text-xs text-muted-foreground mt-2">
                Also pending: the {pendingReport.codename} report for {pendingReport.due}.
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-3">{nextAction(role, cp, primaryGap)}</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {lines.map(({ t, have, want, pct, gap }) => (
              <Card key={t.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.label}{t.gate && <span className="ml-2 text-[10px] font-mono uppercase text-muted-foreground">gate</span>}</div>
                  <Badge variant="outline" className={BAND_META[bandFor(pct, cp === "eod", false)].tone}>{pct}%</Badge>
                </div>
                <div className="flex items-end gap-2">
                  <div className="font-display text-3xl font-semibold">{have}</div>
                  <div className="text-sm text-muted-foreground mb-1">/ {want} by {cp === "p1" ? "1 PM" : cp === "p2" ? "5 PM" : "EOD"}</div>
                </div>
                <Progress value={Math.min(100, pct)} />
                <div className="text-xs text-muted-foreground">
                  Gap now: <span className="font-medium text-foreground">{gap}</span> · EOD {t.eod} · Week {t.weekly} · Month {t.monthly}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => bump(actor.id, role.id, t.id, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" onClick={() => bump(actor.id, role.id, t.id, 1)}><Plus className="h-3.5 w-3.5 mr-1" /> Log {t.label}</Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Today's flow — tick every step</div>
            {phases.map((p, i) => (
              <PhaseCard
                key={p.id}
                phase={p}
                index={i}
                role={role}
                day={day}
                actorId={actor.id}
                cp={cp}
                counts={counts}
                openByDefault={p.id === nowPhase}
              />
            ))}
          </div>

          {needsRecovery && (
            <RecoveryCard
              role={role}
              actorId={actor.id}
              checkpoint={CHECKPOINT_LABEL[cp]}
              metric={primaryGap.t.label}
              gap={primaryGap.gap}
              pct={overallPct}
            />
          )}

          {day.recoveries?.length > 0 && (
            <Card className="p-5 space-y-2">
              <div className="font-medium text-sm">Recovery plans submitted today</div>
              {day.recoveries.map((r, i) => (
                <div key={i} className="text-xs text-muted-foreground border-l-2 border-warning/60 pl-3 py-1">
                  <div className="font-mono uppercase tracking-widest">{r.checkpoint} · {r.metric} · gap {r.gap}</div>
                  {r.answers.filter(Boolean).map((a, j) => <div key={j}>• {a}</div>)}
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        {/* ---------------- PLAYBOOK ---------------- */}
        <TabsContent value="playbook" className="space-y-5 mt-5">
          <Card className="p-5 grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Department" value={role.department} />
            <Info label="Role purpose" value={role.purpose} />
            <Info label="Final result owned" value={role.finalResult} />
            <Info label="Starts when" value={role.startsWhen} />
            <Info label="Ends when" value={role.endsWhen} />
            <Info label="Handover to" value={role.handoverTo} />
            <Info label="Roles consolidated into this one" value={role.absorbs.join(", ")} />
          </Card>

          <Card className="p-5">
            <div className="font-medium mb-3">Locked daily targets</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Metric</th><th>P1 · 1 PM</th><th>P2 · 5 PM</th><th>EOD</th><th>Weekly</th><th>Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {role.targets.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-2 font-medium">{t.label}</td>
                      <td>{t.p1}</td><td>{t.p2}</td><td>{t.eod}</td><td>{t.weekly}</td><td>{t.monthly}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Weekly assumes {WORKING_DAYS_WEEK} working days, monthly {WORKING_DAYS_MONTH}.</p>
          </Card>

          <Card className="p-5">
            <div className="font-medium mb-3">Five weighted KRAs</div>
            <div className="space-y-3">
              {role.kras.map((k) => (
                <div key={k.name}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{k.name}</span><span className="font-mono">{k.weight}%</span></div>
                  <Progress value={k.weight} className="mt-1" />
                  <div className="text-xs text-muted-foreground mt-1">{k.measure}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="font-medium">The 22-section operating document</div>
            <div className="grid gap-4 md:grid-cols-2">
              {phases.map((p) => (
                <div key={p.id} className="border border-border rounded-md p-4">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{p.window}</div>
                  <p className="text-xs text-muted-foreground mt-1">{p.brief}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {p.steps.map((s) => <li key={s.id} className="flex gap-2"><span className="text-primary">•</span>{s.label}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Mandatory checkpoints" items={role.checkpoints} />
            <ListCard title="Non-negotiables" items={role.nonNegotiables} />
            <ListCard title="Escalation triggers" items={role.escalations} />
            <ListCard title="Manager review questions" items={role.reviewQuestions} />
          </div>

          <Card className="p-5 space-y-4">
            <div className="font-medium">Result-centric incentive models</div>
            {role.incentives.map((m) => (
              <div key={m.id} className="border border-border rounded-md p-4">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground mb-2">{m.summary}</div>
                {m.rows.map((r) => (
                  <div key={r.band} className="flex justify-between text-sm py-1 border-t border-border/60">
                    <span>{r.band}</span><span className="font-mono">{r.payout}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="text-xs text-muted-foreground">
              Incentive gates: EOD cannot close without evidence or an approved recovery plan. Two daily misses trigger coaching and an execution audit. Three misses trigger Performance Enforcer review. False evidence places the incentive on hold immediately.
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-medium mb-2">Achievement-enforcement bands</div>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              {[
                ["Stretch", "≥ 120% of checkpoint pace"],
                ["Achieved", "100–119%"],
                ["On Track", "90–99%"],
                ["At Risk", "75–89% · alert raised"],
                ["Missed", "< 75% · 15-minute recovery plan"],
                ["Gate Failed", "Gate metric short at EOD · incentive blocked"],
              ].map(([a, b]) => (
                <div key={a} className="border border-border rounded-md p-3">
                  <div className="font-medium">{a}</div>
                  <div className="text-xs text-muted-foreground">{b}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- ANALYTICS ---------------- */}
        <TabsContent value="analytics" className="space-y-5 mt-5">
          {hydrated ? <Analytics role={role} actorId={actor.id} /> : <Card className="p-5 text-sm text-muted-foreground">Loading analytics…</Card>}
        </TabsContent>

        <TabsContent value="team" className="space-y-5 mt-5">
          {hydrated ? <TeamAnalytics role={role} /> : <Card className="p-5 text-sm text-muted-foreground">Loading team analytics…</Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- phase card ---------------- */

function PhaseCard(props: {
  phase: FlowPhase; index: number; role: CoreRole; day: CoreDay; actorId: string;
  cp: "p1" | "p2" | "eod"; counts: Record<string, number>; openByDefault: boolean;
}) {
  const { phase, index, role, day, actorId, openByDefault } = props;
  const [open, setOpen] = useState(openByDefault);
  const done = phase.steps.filter((s) => day.checks[s.id]).length;
  const all = phase.steps.length;
  const ticked = done === all;
  const submission = day.submissions?.[phase.id];
  const complete = ticked && !!submission;
  const started = !!day.phases[phase.id]?.startedAt;
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const overdue = !complete && nowMins > phase.dueMins;

  const cpTargets = phase.checkpoint
    ? role.targets.map((t) => ({ t, have: props.counts[t.id] || 0, want: targetAt(t, phase.checkpoint!) }))
    : [];

  return (
    <Card className={`overflow-hidden ${complete ? "border-success/40" : overdue ? "border-destructive/40" : started ? "border-primary/40" : ""}`}>
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen((o) => !o)}>
        <span className={`h-7 w-7 shrink-0 rounded-full border flex items-center justify-center text-xs font-mono
          ${complete ? "bg-success/20 border-success/50 text-success" : overdue ? "bg-destructive/15 border-destructive/50 text-destructive" : "border-border text-muted-foreground"}`}>
          {complete ? <Check className="h-4 w-4" /> : index}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium truncate">
            <span className="font-display">{phase.codename}</span>
            <span className="text-muted-foreground font-normal"> · {phase.name}</span>
          </span>
          <span className="block text-xs text-muted-foreground">{phase.window} · {done}/{all} ticked{overdue ? " · overdue" : ""}</span>
        </span>
        {phase.checkpoint && <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px]">due {phase.due}</Badge>}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">{phase.brief}</p>

          {!started && (
            <Button size="sm" variant="outline" onClick={() => startPhase(actorId, role.id, phase.id)}>
              <PlayCircle className="h-3.5 w-3.5 mr-1" /> Start this phase
            </Button>
          )}

          <div className="space-y-1.5">
            {phase.steps.map((s) => {
              const ticked = !!day.checks[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStep(actorId, role.id, s.id)}
                  className={`w-full flex items-start gap-3 rounded-md border p-3 text-left transition-colors
                    ${ticked ? "border-success/40 bg-success/5" : "border-border hover:border-primary/40 hover:bg-secondary/40"}`}
                >
                  {ticked
                    ? <Check className="h-4 w-4 mt-0.5 text-success shrink-0" />
                    : <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
                  <span className="min-w-0">
                    <span className={`block text-sm ${ticked ? "line-through text-muted-foreground" : ""}`}>{s.label}</span>
                    {s.detail && <span className="block text-xs text-muted-foreground mt-0.5">{s.detail}</span>}
                    {s.evidence && <span className="mt-1 inline-block text-[10px] font-mono uppercase tracking-widest text-primary">Evidence: {s.evidence}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {cpTargets.length > 0 && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Checkpoint gate · {phase.due}</div>
              {cpTargets.map(({ t, have, want }) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{t.label}</span>
                  <span className="font-mono">{have}/{want}</span>
                  <Badge variant="outline" className={BAND_META[bandFor(pctOf(have, want))].tone}>{pctOf(have, want)}%</Badge>
                </div>
              ))}
            </div>
          )}

          <PhaseReport
            phase={phase}
            actorId={actorId}
            roleId={role.id}
            existing={submission?.values}
            submittedAt={submission?.ts}
            counts={props.counts}
          />

          <Button
            size="sm"
            disabled={!complete || !!day.phases[phase.id]?.doneAt}
            onClick={() => completePhase(actorId, role.id, phase.id)}
          >
            {day.phases[phase.id]?.doneAt
              ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Phase closed</>
              : complete
                ? <><Check className="h-3.5 w-3.5 mr-1" /> Mark {phase.codename} complete</>
                : !ticked
                  ? <><Lock className="h-3.5 w-3.5 mr-1" /> Tick all {all} steps to close</>
                  : <><Lock className="h-3.5 w-3.5 mr-1" /> Submit the {phase.codename} report to close</>}
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ---------------- end-of-phase submission ---------------- */

function PhaseReport(props: {
  phase: FlowPhase; actorId: string; roleId: CoreRole["id"];
  existing?: Record<string, string>; submittedAt?: number; counts: Record<string, number>;
}) {
  const { phase, actorId, roleId, existing, submittedAt, counts } = props;
  const prefill = useMemo(() => {
    const out: Record<string, string> = {};
    for (const fl of phase.report) {
      const m = /^m_(?:p1|p2|eod)_(.+)$/.exec(fl.id);
      if (m) out[fl.id] = String(counts[m[1]] ?? 0);
    }
    return out;
  }, [phase, counts]);
  const [values, setValues] = useState<Record<string, string>>({ ...prefill, ...(existing || {}) });
  const [editing, setEditing] = useState(!submittedAt);
  useEffect(() => { setValues((v) => ({ ...prefill, ...(existing || {}), ...v })); }, [prefill, existing]);

  const missing = phase.report.filter((f) => f.required !== false && !String(values[f.id] ?? "").trim());

  if (submittedAt && !editing) {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <FileText className="h-4 w-4" /> {phase.codename} report submitted
          <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {new Date(submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {phase.report.map((f) => (
          <div key={f.id} className="text-xs">
            <span className="text-muted-foreground">{f.label}: </span>
            <span className="text-foreground">{values[f.id] || "—"}</span>
          </div>
        ))}
        <Button size="sm" variant="outline" className="mt-1" onClick={() => setEditing(true)}>Edit report</Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" /> Submit the {phase.codename} report
      </div>
      <p className="text-xs text-muted-foreground">
        This is the data your manager sees for {phase.due}. Numbers first, then the honest one-liners.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {phase.report.map((f) => (
          <div key={f.id} className={f.kind === "long" ? "sm:col-span-2" : ""}>
            <label className="block text-xs text-muted-foreground mb-1">
              {f.label}{f.required === false && <span className="ml-1 text-[10px] uppercase font-mono">optional</span>}
            </label>
            {f.kind === "long" ? (
              <Textarea
                rows={2}
                value={values[f.id] || ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            ) : (
              <Input
                type={f.kind === "number" ? "number" : "text"}
                value={values[f.id] || ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={missing.length > 0}
          onClick={() => {
            submitPhase(actorId, roleId, phase.id, values);
            // Reported actuals reconcile the live counters so analytics stay honest.
            for (const [k, val] of Object.entries(values)) {
              const m = /^m_(?:p1|p2|eod)_(.+)$/.exec(k);
              if (m && val !== "" && !Number.isNaN(Number(val))) setCount(actorId, roleId, m[1], Number(val));
            }
            setEditing(false);
          }}
        >
          <Send className="h-3.5 w-3.5 mr-1" /> Submit {phase.codename} report
        </Button>
        {missing.length > 0 && (
          <span className="text-xs text-muted-foreground">{missing.length} field{missing.length === 1 ? "" : "s"} still empty</span>
        )}
      </div>
    </div>
  );
}

function nextAction(role: CoreRole, cp: "p1" | "p2" | "eod", primary: { t: TargetLine; gap: number; have: number }) {
  if (primary.gap <= 0) {
    return cp === "eod"
      ? `All ${role.name} targets are met. Lock evidence, file the EOD report and hand over to ${role.handoverTo}.`
      : `You are ahead of the ${cp === "p1" ? "1 PM" : "5 PM"} checkpoint. Push into the stretch band on ${primary.t.label}.`;
  }
  return `Close ${primary.gap} more ${primary.t.label.toLowerCase()} before the ${cp === "p1" ? "1:00 PM" : cp === "p2" ? "5:00 PM" : "8:00 PM"} checkpoint — this is the primary gap right now.`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-5">
      <div className="font-medium mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{i}</li>)}
      </ul>
    </Card>
  );
}

function RecoveryCard(props: {
  role: CoreRole; actorId: string; checkpoint: string; metric: string; gap: number; pct: number;
}) {
  const { role, actorId, checkpoint, metric, gap, pct } = props;
  const [answers, setAnswers] = useState<string[]>(role.reviewQuestions.map(() => ""));
  const [sent, setSent] = useState(false);
  const severe = pct < 75;

  return (
    <Card className={`p-5 space-y-3 ${severe ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"}`}>
      <div className="flex items-center gap-2 font-medium">
        {severe ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
        {severe ? "Missed" : "At Risk"} · {pct}% of checkpoint pace
      </div>
      <p className="text-sm text-muted-foreground">
        {checkpoint} · primary gap is <strong className="text-foreground">{gap} {metric}</strong>. Submit a quantified recovery plan within 15 minutes. EOD cannot close without it.
      </p>
      {sent ? (
        <div className="text-sm text-success">Recovery plan submitted. Your manager has been notified.</div>
      ) : (
        <>
          {role.reviewQuestions.map((q, i) => (
            <div key={q}>
              <div className="text-sm mb-1">{q}</div>
              <Textarea
                rows={2}
                value={answers[i]}
                onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder="Be specific and use a number."
              />
            </div>
          ))}
          <Button
            disabled={answers.every((a) => !a.trim())}
            onClick={() => {
              addRecovery(actorId, role.id, { ts: Date.now(), checkpoint, metric, gap, answers });
              setSent(true);
            }}
          >
            Submit recovery plan
          </Button>
        </>
      )}
    </Card>
  );
}

function Analytics({ role, actorId }: { role: CoreRole; actorId: string }) {
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const me = EMPLOYEES.find((e) => e.id === actorId);
  const mine = !!me && coreRoleOf(me.role).id === role.id;
  const people = useMemo(
    () => (mine ? [actorId] : EMPLOYEES.filter((e) => coreRoleOf(e.role).id === role.id).map((e) => e.id)),
    [mine, actorId, role.id],
  );
  const days = useMemo(() => {
    void v;
    const per = people.map((id) => history(id, role.id, 14));
    if (per.length === 0) return history(actorId, role.id, 14);
    return per[0].map((d, i) => ({
      ...d,
      counts: per.reduce<Record<string, number>>((acc, h) => {
        for (const [k, n] of Object.entries(h[i].counts || {})) acc[k] = (acc[k] || 0) + n;
        return acc;
      }, {}),
      checks: Object.assign({}, ...per.map((h) => h[i].checks || {})),
      phases: per[0][i].phases,
      recoveries: per.flatMap((h) => h[i].recoveries || []),
    }));
  }, [people, role.id, actorId, v]);
  const scale = mine ? 1 : Math.max(1, people.length);
  const last6 = days.slice(-WORKING_DAYS_WEEK);
  const phases = phasesFor(role);
  const totalSteps = phases.flatMap((p) => p.steps).length;
  const compliance = Math.round(
    (days.reduce((a, d) => a + Math.min(totalSteps, Object.keys(d.checks || {}).length), 0) / (totalSteps * days.length)) * 100,
  );
  const recoveries = days.flatMap((d) => (d.recoveries || []).map((r) => ({ ...r, date: d.date })));

  return (
    <div className="space-y-5">
      {!mine && (
        <Card className="p-4 text-sm text-muted-foreground border-primary/30 bg-primary/5">
          You are not mapped to {role.name} — showing the combined analytics for all {people.length} people running this role. Targets below are scaled to the team.
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {role.targets.map((t) => {
          const weekly = t.weekly * scale;
          const monthly = t.monthly * scale;
          const perDayTarget = t.eod * scale;
          const weekHave = last6.reduce((a, d) => a + (d.counts[t.id] || 0), 0);
          const monthHave = days.reduce((a, d) => a + (d.counts[t.id] || 0), 0);
          const dayAvg = weekHave / WORKING_DAYS_WEEK;
          const weekPct = pctOf(weekHave, weekly);
          const monthForecast = Math.round(dayAvg * WORKING_DAYS_MONTH);
          const monthPct = pctOf(monthForecast, monthly);
          return (
            <Card key={t.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.label}</div>
                <Badge variant="outline" className={BAND_META[bandFor(weekPct)].tone}>Week {weekPct}%</Badge>
              </div>
              <Row label={`Weekly (${WORKING_DAYS_WEEK} days)`} have={weekHave} want={weekly} />
              <Row label="Rolling 14-day logged" have={monthHave} want={monthly} />
              <Row label={`Monthly forecast (${WORKING_DAYS_MONTH} days)`} have={monthForecast} want={monthly} />
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Running at {dayAvg.toFixed(1)}/day vs {perDayTarget}/day required · monthly pace {monthPct}%
              </div>
              <Spark values={days.map((d) => d.counts[t.id] || 0)} target={perDayTarget} />
            </Card>
          );
        })}
      </div>

      <Card className="p-5 space-y-3">
        <div className="font-medium">Flow compliance</div>
        <Row label="Checklist steps ticked (14-day)" have={compliance} want={100} />
        <div className="grid gap-2 sm:grid-cols-5">
          {phases.map((p) => {
            const closed = days.filter((d) => d.phases?.[p.id]?.doneAt).length;
            return (
              <div key={p.id} className="border border-border rounded-md p-3">
                <div className="text-xs font-medium">{p.name.split(" · ")[0]}</div>
                <div className="font-display text-xl">{closed}<span className="text-sm text-muted-foreground">/{days.length}</span></div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">closed on time</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="font-medium mb-3">Daily achievement — last 14 days</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                <th className="py-2">Date</th>
                {role.targets.map((t) => <th key={t.id}>{t.label}</th>)}
                <th>Achievement</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => {
                const pcts = role.targets.map((t) => pctOf(d.counts[t.id] || 0, t.eod * scale));
                const avg = Math.round(pcts.reduce((a, b) => a + Math.min(150, b), 0) / pcts.length);
                const gateFail = role.targets.some((t) => t.gate && (d.counts[t.id] || 0) < t.eod * scale);
                const b = bandFor(avg, true, gateFail && avg < 100);
                return (
                  <tr key={d.date} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{d.date}</td>
                    {role.targets.map((t) => <td key={t.id}>{d.counts[t.id] || 0}<span className="text-muted-foreground">/{t.eod * scale}</span></td>)}
                    <td className="font-mono">{avg}%</td>
                    <td><Badge variant="outline" className={BAND_META[b].tone}>{BAND_META[b].label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {recoveries.length > 0 && (
        <Card className="p-5 space-y-2">
          <div className="font-medium">Recovery plan history</div>
          {recoveries.slice(-8).reverse().map((r, i) => (
            <div key={i} className="text-xs text-muted-foreground border-l-2 border-warning/60 pl-3 py-1">
              <div className="font-mono uppercase tracking-widest">{r.date} · {r.metric} · gap {r.gap}</div>
              {r.answers.filter(Boolean).map((a, j) => <div key={j}>• {a}</div>)}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function TeamAnalytics({ role }: { role: CoreRole }) {
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const rows = useMemo(() => {
    void v;
    const today = allToday(role.id);
    const people = EMPLOYEES.filter((e) => coreRoleOf(e.role).id === role.id);
    return people.map((p) => {
      const rec = today.find((r) => r.employeeId === p.id);
      const counts = rec?.counts || {};
      const pcts = role.targets.map((t) => pctOf(counts[t.id] || 0, t.eod));
      const avg = Math.round(pcts.reduce((a, b) => a + Math.min(150, b), 0) / pcts.length);
      const steps = Object.keys(rec?.checks || {}).length;
      return { p, counts, avg, steps, recoveries: rec?.recoveries?.length || 0 };
    }).sort((a, b) => b.avg - a.avg);
  }, [role, v]);

  if (rows.length === 0) {
    return <Card className="p-5 text-sm text-muted-foreground">No one is currently mapped to {role.name}.</Card>;
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 font-medium mb-3"><Users className="h-4 w-4 text-primary" /> Who is doing what — today</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              <th className="py-2">Person</th>
              {role.targets.map((t) => <th key={t.id}>{t.label}</th>)}
              <th>Steps</th><th>Recovery</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, counts, avg, steps, recoveries }) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{p.team}</div>
                </td>
                {role.targets.map((t) => (
                  <td key={t.id}>{counts[t.id] || 0}<span className="text-muted-foreground">/{t.eod}</span></td>
                ))}
                <td className="font-mono">{steps}</td>
                <td className="font-mono">{recoveries}</td>
                <td><Badge variant="outline" className={BAND_META[bandFor(avg)].tone}>{BAND_META[bandFor(avg)].label} · {avg}%</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Link to="/flow/admin" className="inline-flex items-center gap-1.5 text-sm text-primary">
          Open full admin analytics <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function Row({ label, have, want }: { label: string; have: number; want: number }) {
  const pct = pctOf(have, want);
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono">{have} / {want}</span></div>
      <Progress value={Math.min(100, pct)} className="mt-1" />
    </div>
  );
}

function Spark({ values, target }: { values: number[]; target: number }) {
  const max = Math.max(target, ...values, 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => (
        <div key={i} className="flex-1 relative">
          <div
            className={`w-full rounded-sm ${v >= target ? "bg-success" : v >= target * 0.75 ? "bg-warning" : "bg-destructive/70"}`}
            style={{ height: `${Math.max(3, (v / max) * 44)}px` }}
            title={`${v}`}
          />
        </div>
      ))}
    </div>
  );
}
