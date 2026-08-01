import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEES } from "@/data/seed";
import {
  CORE_ROLES, BAND_META, bandFor, currentCheckpoint, CHECKPOINT_LABEL, targetAt,
  WORKING_DAYS_WEEK, WORKING_DAYS_MONTH, type CoreRole,
} from "@/lib/execution/core-roles";
import { phasesFor } from "@/lib/execution/core-tasks";
import { subscribeCore, coreVersion, allToday, history } from "@/lib/execution/core-progress";
import { seedCoreDemo, coreRoleOf } from "@/lib/execution/core-seed";
import { AlertTriangle, ArrowRight, ShieldAlert, TrendingUp, Users, Activity } from "lucide-react";

export const Route = createFileRoute("/flow/admin")({
  head: () => ({
    meta: [
      { title: "Admin Analytics · 100X Execution Reporting" },
      { name: "description", content: "Live org-wide reporting across Control Tower, Flow Ops, Tour Conversion and Closing — who is doing what, achievement percentages, alerts and recovery plans." },
      { property: "og:title", content: "Admin Analytics · 100X Execution Reporting" },
      { property: "og:description", content: "Achievement bands, checkpoint pace, primary gaps, recovery tracking and forecasting for all four core roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAnalytics,
});

const pct = (h: number, w: number) => (w <= 0 ? 100 : Math.round((h / w) * 100));

function AdminAnalytics() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { seedCoreDemo(); setHydrated(true); }, []);
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const cp = currentCheckpoint();

  const data = useMemo(() => {
    void v;
    if (!hydrated) return [];
    return CORE_ROLES.map((role) => {
      const today = allToday(role.id);
      const people = EMPLOYEES.filter((e) => coreRoleOf(e.role).id === role.id).map((p) => {
        const rec = today.find((r) => r.employeeId === p.id);
        const counts = rec?.counts || {};
        const lines = role.targets.map((t) => {
          const have = counts[t.id] || 0;
          const want = targetAt(t, cp);
          return { t, have, want, pct: pct(have, want), gap: Math.max(0, want - have) };
        });
        const avg = Math.round(lines.reduce((a, l) => a + Math.min(150, l.pct), 0) / lines.length);
        const primary = [...lines].sort((a, b) => b.gap - a.gap)[0];
        const totalSteps = phasesFor(role).flatMap((p) => p.steps).length;
        const steps = Object.keys(rec?.checks || {}).length;
        return { p, lines, avg, primary, steps, totalSteps, recoveries: rec?.recoveries || [] };
      });
      const roleAvg = people.length ? Math.round(people.reduce((a, x) => a + x.avg, 0) / people.length) : 0;
      const delivered = role.targets.map((t) => ({
        t,
        have: people.reduce((a, x) => a + (x.lines.find((l) => l.t.id === t.id)?.have || 0), 0),
        want: people.length * targetAt(t, cp),
        eodWant: people.length * t.eod,
      }));
      return { role, people, roleAvg, delivered };
    });
  }, [v, cp, hydrated]);

  const alerts = data.flatMap((d) =>
    d.people
      .filter((x) => x.avg < 90)
      .map((x) => ({
        role: d.role, name: x.p.name, avg: x.avg,
        metric: x.primary.t.label, gap: x.primary.gap,
        severe: x.avg < 75, planned: x.recoveries.length > 0,
      })),
  ).sort((a, b) => a.avg - b.avg);

  const orgAvg = data.length ? Math.round(data.reduce((a, d) => a + d.roleAvg, 0) / data.length) : 0;

  if (!hydrated) return <div className="p-6 text-sm text-muted-foreground">Loading execution reporting…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Execution reporting</div>
          <h1 className="font-display text-2xl font-semibold">Admin analytics</h1>
          <p className="text-sm text-muted-foreground">Who is doing what, right now, across all four core roles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono">{CHECKPOINT_LABEL[cp]}</Badge>
          <Badge variant="outline" className={BAND_META[bandFor(orgAvg)].tone}>Org {orgAvg}% · {BAND_META[bandFor(orgAvg)].label}</Badge>
          <Badge variant="outline" className={alerts.length ? "border-destructive/40 text-destructive" : ""}>{alerts.length} alerts</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.map(({ role, roleAvg, people, delivered }) => (
          <Card key={role.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-sm">{role.name}</div>
              <Badge variant="outline" className={BAND_META[bandFor(roleAvg)].tone}>{roleAvg}%</Badge>
            </div>
            {delivered.map((d) => (
              <div key={d.t.id}>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{d.t.label}</span><span className="font-mono">{d.have}/{d.want}</span></div>
                <Progress value={Math.min(100, pct(d.have, d.want))} className="mt-1" />
              </div>
            ))}
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {people.length} people
            </div>
            <Link to="/flow/$role" params={{ role: role.id }} className="inline-flex items-center gap-1 text-xs text-primary">
              Open flow <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="people">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="alerts">Alerts &amp; recovery</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="compliance">Flow compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-5 mt-5">
          {data.map(({ role, people }) => (
            <Card key={role.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{role.name}</div>
                <div className="text-xs text-muted-foreground">{role.finalResult}</div>
              </div>
              {people.length === 0 ? (
                <div className="text-sm text-muted-foreground">No one mapped to this role yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                        <th className="py-2">Person</th>
                        {role.targets.map((t) => <th key={t.id}>{t.label}</th>)}
                        <th>Primary gap</th><th>Steps</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...people].sort((a, b) => b.avg - a.avg).map((x) => (
                        <tr key={x.p.id} className="border-t border-border">
                          <td className="py-2">
                            <div className="font-medium">{x.p.name}</div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{x.p.team} · {x.p.zone}</div>
                          </td>
                          {x.lines.map((l) => (
                            <td key={l.t.id} className="whitespace-nowrap">{l.have}<span className="text-muted-foreground">/{l.want}</span></td>
                          ))}
                          <td className="whitespace-nowrap">{x.primary.gap > 0 ? `${x.primary.gap} ${x.primary.t.label}` : "—"}</td>
                          <td className="font-mono">{x.steps}/{x.totalSteps}</td>
                          <td><Badge variant="outline" className={BAND_META[bandFor(x.avg)].tone}>{BAND_META[bandFor(x.avg)].label} · {x.avg}%</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-5">
          {alerts.length === 0 ? (
            <Card className="p-5 text-sm text-success">Everyone is at or above 90% of checkpoint pace. No alerts.</Card>
          ) : alerts.map((a, i) => (
            <Card key={i} className={`p-4 flex flex-wrap items-center gap-3 ${a.severe ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"}`}>
              {a.severe ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.name} · {a.role.name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.severe ? "Missed" : "At Risk"} at {a.avg}% of {CHECKPOINT_LABEL[cp]} pace · gap {a.gap} {a.metric} · recovery plan due within 15 minutes.
                </div>
              </div>
              <Badge variant="outline" className={a.planned ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
                {a.planned ? "Plan submitted" : "Plan pending"}
              </Badge>
            </Card>
          ))}
          <Card className="p-5 text-xs text-muted-foreground">
            Two daily misses trigger coaching and an execution audit. Three misses trigger Performance Enforcer review. EOD cannot close without evidence or an approved recovery plan. False evidence places the incentive on hold immediately.
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-5 mt-5">
          {CORE_ROLES.map((role) => <Forecast key={role.id} role={role} />)}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-5 mt-5">
          {data.map(({ role, people }) => (
            <Card key={role.id} className="p-5">
              <div className="flex items-center gap-2 font-medium mb-3"><Activity className="h-4 w-4 text-primary" /> {role.name} · checklist compliance today</div>
              <div className="space-y-2">
                {people.map((x) => (
                  <div key={x.p.id}>
                    <div className="flex justify-between text-sm"><span>{x.p.name}</span><span className="font-mono">{x.steps}/{x.totalSteps}</span></div>
                    <Progress value={pct(x.steps, x.totalSteps)} className="mt-1" />
                  </div>
                ))}
                {people.length === 0 && <div className="text-sm text-muted-foreground">No one mapped.</div>}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Forecast({ role }: { role: CoreRole }) {
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const people = EMPLOYEES.filter((e) => coreRoleOf(e.role).id === role.id);
  const rows = useMemo(() => {
    void v;
    return role.targets.map((t) => {
      let week = 0;
      for (const p of people) {
        const days = history(p.id, role.id, WORKING_DAYS_WEEK);
        week += days.reduce((a, d) => a + (d.counts[t.id] || 0), 0);
      }
      const capacityWeek = people.length * t.weekly;
      const perDay = week / WORKING_DAYS_WEEK;
      const monthForecast = Math.round(perDay * WORKING_DAYS_MONTH);
      const capacityMonth = people.length * t.monthly;
      return { t, week, capacityWeek, monthForecast, capacityMonth, perDay };
    });
  }, [role, people, v]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{role.name}</div>
        <Badge variant="outline">{people.length} people</Badge>
      </div>
      {rows.map((r) => (
        <div key={r.t.id} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.t.label} · weekly</span>
            <span className="font-mono">{r.week} / {r.capacityWeek}</span>
          </div>
          <Progress value={Math.min(100, pct(r.week, r.capacityWeek))} />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.t.label} · monthly forecast</span>
            <span className="font-mono">{r.monthForecast} / {r.capacityMonth}</span>
          </div>
          <Progress value={Math.min(100, pct(r.monthForecast, r.capacityMonth))} />
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Team pace {r.perDay.toFixed(1)}/day vs {people.length * r.t.eod}/day required
          </div>
        </div>
      ))}
    </Card>
  );
}
