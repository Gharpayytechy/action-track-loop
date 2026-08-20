import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CORE_ROLES, BAND_META, bandFor, currentCheckpoint, CHECKPOINT_LABEL, targetAt } from "@/lib/execution/core-roles";
import { phasesFor, activePhaseId } from "@/lib/execution/core-tasks";
import { subscribeCore, coreVersion, getCoreDay } from "@/lib/execution/core-progress";
import { seedCoreDemo } from "@/lib/execution/core-seed";
import { useAttendanceState } from "@/hooks/useAttendance";
import { ArrowRight, Target, BarChart3, Clock } from "lucide-react";
import { ROLE_FLOWS } from "@/lib/execution/role-flows";

export const Route = createFileRoute("/flow/")({
  head: () => ({
    meta: [
      { title: "Role Daily Flows · 100X Operating System" },
      { name: "description", content: "Four core roles — Control Tower, Flow Ops, Tour Conversion Manager, Closing Specialist — with locked daily targets, tickable daily flows, playbooks and analytics." },
      { property: "og:title", content: "Role Daily Flows · 100X Operating System" },
      { property: "og:description", content: "Locked P1/P2/EOD targets, weighted KRAs, enforcement bands and incentives for every core role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlowIndex,
});

function FlowIndex() {
  const { actor } = useAttendanceState();
  const [hydrated, setHydrated] = useState(false);
  // Clock-derived values must not render on the server: the server's "now" and
  // the browser's "now" disagree, which shows up as a hydration mismatch.
  const [clock, setClock] = useState<{ cp: ReturnType<typeof currentCheckpoint>; phaseId: string } | null>(null);
  useEffect(() => {
    seedCoreDemo();
    setClock({ cp: currentCheckpoint(), phaseId: activePhaseId() });
    setHydrated(true);
  }, []);
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const cp = clock?.cp ?? "p1";
  const phaseId = clock?.phaseId ?? "";

  const cards = useMemo(() => {
    void v;
    return CORE_ROLES.map((r) => {
      const day = hydrated ? getCoreDay(actor.id, r.id) : null;
      const lines = r.targets.map((t) => {
        const have = day?.counts[t.id] || 0;
        const want = targetAt(t, cp);
        return { t, have, want, pct: want ? Math.round((have / want) * 100) : 100 };
      });
      const avg = Math.round(lines.reduce((a, l) => a + Math.min(150, l.pct), 0) / lines.length);
      const phases = phasesFor(r);
      const phase = phases.find((p) => p.id === phaseId) || phases[0];
      const total = phases.flatMap((p) => p.steps).length;
      const done = day ? phases.flatMap((p) => p.steps).filter((s) => day.checks[s.id]).length : 0;
      const nextStep = phases.flatMap((p) => p.steps).find((s) => !day?.checks[s.id]);
      return { r, lines, avg, phase, total, done, nextStep };
    });
  }, [actor.id, cp, phaseId, v, hydrated]);

  const teamFlows = ROLE_FLOWS.filter((flow) =>
    ["TEC-BUILD", "HR-PEOPLE", "REC-HIRE"].includes(flow.roleId),
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Role daily flows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The playbook is consolidated into four core roles. One owner, one result, one set of locked targets — with a tickable flow so nobody forgets what comes next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono"><Clock className="h-3 w-3 mr-1" />{CHECKPOINT_LABEL[cp]}</Badge>
          <Link to="/flow/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <BarChart3 className="h-4 w-4" /> Admin analytics
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-primary">New team role flows</div>
            <h2 className="font-display text-xl font-semibold">Tech, HR &amp; Recruitment</h2>
          </div>
          <Link to="/flows" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            View every role flow <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {teamFlows.map((flow) => (
            <Card key={flow.roleId} className="p-5 space-y-3 border-primary/30">
              <div>
                <Badge variant="outline" className="font-mono text-[10px] mb-2">{flow.roleId}</Badge>
                <h3 className="font-display text-lg font-semibold leading-tight">{flow.roleName}</h3>
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{flow.department}</div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-4">{flow.result}</p>
              <div className="text-xs text-muted-foreground">{flow.metrics.length} role KPIs · 5 WhatsApp checkpoints</div>
              <Link
                to="/daily"
                search={{ pb: flow.playbookId }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                Open this role flow <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ r, lines, avg, phase, total, done, nextStep }) => (
          <Card key={r.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold">{r.name}</div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{r.department}</div>
              </div>
              <Badge variant="outline" className={BAND_META[bandFor(avg)].tone}>{avg}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{r.finalResult}</p>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary">Next up · {phase.name}</div>
              <div className="text-sm mt-0.5">{nextStep ? nextStep.label : "Every step ticked for today."}</div>
            </div>

            {lines.map((l) => (
              <div key={l.t.id}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{l.t.label}</span>
                  <span className="font-mono">{l.have}/{l.want} · EOD {l.t.eod}</span>
                </div>
                <Progress value={Math.min(100, l.pct)} className="mt-1" />
              </div>
            ))}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span><Target className="h-3 w-3 inline mr-1" />{done}/{total} steps ticked</span>
              <span>Absorbs {r.absorbs.length} legacy roles</span>
            </div>

            <Link
              to="/flow/$role"
              params={{ role: r.id }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              Open daily flow <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
