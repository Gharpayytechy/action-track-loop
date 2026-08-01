import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAttendanceState } from "@/hooks/useAttendance";
import {
  coreRole, BAND_META, bandFor, currentCheckpoint, CHECKPOINT_LABEL,
  targetAt, WORKING_DAYS_WEEK, WORKING_DAYS_MONTH, type CoreRole, type TargetLine,
} from "@/lib/execution/core-roles";
import {
  getCoreDay, bump, addRecovery, history, subscribeCore, coreVersion,
} from "@/lib/execution/core-progress";
import {
  ArrowRight, Minus, Plus, ShieldAlert, Target, TrendingUp, Clock, CheckCircle2, AlertTriangle,
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

function pctOf(have: number, want: number) {
  if (want <= 0) return 100;
  return Math.round((have / want) * 100);
}

function RoleFlowPage() {
  const { role: roleParam } = Route.useParams();
  const role = coreRole(roleParam)!;
  const { actor } = useAttendanceState();
  const v = useCoreVersion();
  const cp = currentCheckpoint();

  const day = useMemo(() => { void v; return getCoreDay(actor.id, role.id); }, [actor.id, role.id, v]);
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
  const needsRecovery = overallPct < 90;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/flow" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Role flows</Link>
          <h1 className="font-display text-2xl font-semibold">{role.name}</h1>
          <p className="text-sm text-muted-foreground">{role.department} · {role.finalResult}</p>
        </div>
        <Badge variant="outline" className={BAND_META[band].tone}>{BAND_META[band].label} · {overallPct}%</Badge>
      </div>

      <Tabs defaultValue="now">
        <TabsList>
          <TabsTrigger value="now">Today</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ---------------- TODAY ---------------- */}
        <TabsContent value="now" className="space-y-5 mt-5">
          <Card className="p-5 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
              <Clock className="h-3.5 w-3.5" /> {CHECKPOINT_LABEL[cp]}
            </div>
            <div className="mt-2 text-lg font-display font-semibold">This is what we are supposed to do next.</div>
            <p className="text-sm text-muted-foreground mt-1">{nextAction(role, cp, primaryGap)}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(cp === "p1" ? role.p1Work : cp === "p2" ? role.p2Work : role.p3Work).map((w) => (
                <li key={w} className="flex gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />{w}</li>
              ))}
            </ul>
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

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-medium"><Target className="h-4 w-4 text-primary" /> Checkpoints</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {role.checkpoints.map((c) => (
                <div key={c} className="text-sm flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />{c}</div>
              ))}
            </div>
          </Card>

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

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Phase 1 · shift start to 1:00 PM" items={role.p1Work} />
            <ListCard title="Phase 2 · 1:00 to 5:00 PM" items={role.p2Work} />
            <ListCard title="Phase 3 · 5:00 PM to EOD" items={role.p3Work} />
            <ListCard title="EOD report" items={role.eodReport} />
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
          <Analytics role={role} actorId={actor.id} />
        </TabsContent>
      </Tabs>
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
  const days = useMemo(() => { void v; return history(actorId, role.id, 14); }, [actorId, role.id, v]);
  const last6 = days.slice(-WORKING_DAYS_WEEK);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {role.targets.map((t) => {
          const weekHave = last6.reduce((a, d) => a + (d.counts[t.id] || 0), 0);
          const monthHave = days.reduce((a, d) => a + (d.counts[t.id] || 0), 0);
          const dayAvg = weekHave / WORKING_DAYS_WEEK;
          const weekPct = pctOf(weekHave, t.weekly);
          const monthForecast = Math.round(dayAvg * WORKING_DAYS_MONTH);
          const monthPct = pctOf(monthForecast, t.monthly);
          return (
            <Card key={t.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.label}</div>
                <Badge variant="outline" className={BAND_META[bandFor(weekPct)].tone}>Week {weekPct}%</Badge>
              </div>
              <Row label={`Weekly (${WORKING_DAYS_WEEK} days)`} have={weekHave} want={t.weekly} />
              <Row label="Rolling 14-day logged" have={monthHave} want={t.monthly} />
              <Row label={`Monthly forecast (${WORKING_DAYS_MONTH} days)`} have={monthForecast} want={t.monthly} />
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Running at {dayAvg.toFixed(1)}/day vs {t.eod}/day required · monthly pace {monthPct}%
              </div>
              <Spark values={days.map((d) => d.counts[t.id] || 0)} target={t.eod} />
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="font-medium mb-3">Last 14 days</div>
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
                const pcts = role.targets.map((t) => pctOf(d.counts[t.id] || 0, t.eod));
                const avg = Math.round(pcts.reduce((a, b) => a + Math.min(150, b), 0) / pcts.length);
                const gate = role.targets.some((t) => t.gate && (d.counts[t.id] || 0) < t.eod);
                const b = bandFor(avg, true, gate && avg > 0 ? true : false);
                return (
                  <tr key={d.date} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{d.date}</td>
                    {role.targets.map((t) => <td key={t.id}>{d.counts[t.id] || 0} <span className="text-muted-foreground text-xs">/ {t.eod}</span></td>)}
                    <td className="font-mono">{avg}%</td>
                    <td><Badge variant="outline" className={BAND_META[b].tone}>{BAND_META[b].label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, have, want }: { label: string; have: number; want: number }) {
  const pct = pctOf(have, want);
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono">{have} / {want}</span></div>
      <Progress value={Math.min(100, pct)} className="mt-1" />
    </div>
  );
}

function Spark({ values, target }: { values: number[]; target: number }) {
  const max = Math.max(target, ...values, 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm bg-primary/60" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={`${v}`} />
      ))}
    </div>
  );
}
