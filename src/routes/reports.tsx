// One-screen live reporting: who is on the floor, who reported when, and how
// every person is tracking against their locked role targets.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEES } from "@/data/seed";
import {
  CORE_ROLES, BAND_META, bandFor, currentCheckpoint, CHECKPOINT_LABEL, targetAt,
  type CoreRole,
} from "@/lib/execution/core-roles";
import { phasesFor } from "@/lib/execution/core-tasks";
import { subscribeCore, coreVersion, history, getCoreDay } from "@/lib/execution/core-progress";
import { seedCoreDemo, coreRoleOf } from "@/lib/execution/core-seed";
import {
  PRESENCE_META, effectiveState, fmtSince, presenceFor, presenceVersion,
  seedPresence, subscribePresence, type EffectiveState,
} from "@/lib/presence-store";
import { Download, Activity, Users, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Live Reports · Who Reported When" },
      { name: "description", content: "Compliance grid, checkpoint reporting, achievement bands and floor presence for all four core roles in one screen." },
      { property: "og:title", content: "Live Reports · Who Reported When" },
      { property: "og:description", content: "Seven-day compliance grid, per-person achievement and live floor status across Control Tower, Flow Ops, Tour Conversion and Closing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const pct = (h: number, w: number) => (w <= 0 ? 100 : Math.round((h / w) * 100));
const DAYS = 7;

function ReportsPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { seedCoreDemo(); seedPresence(); setHydrated(true); }, []);
  const v = useSyncExternalStore(subscribeCore, () => coreVersion(), () => 0);
  const pv = useSyncExternalStore(subscribePresence, () => presenceVersion(), () => 0);
  const cp = currentCheckpoint();
  const [roleFilter, setRoleFilter] = useState<"all" | CoreRole["id"]>("all");

  const rows = useMemo(() => {
    void v; void pv;
    if (!hydrated) return [];
    return EMPLOYEES.map((e) => {
      const role = coreRoleOf(e.role);
      const hist = history(e.id, role.id, DAYS);
      const today = getCoreDay(e.id, role.id);
      const slots = phasesFor(role).filter((p) => p.id !== "p3");   // 4 reporting slots
      const grid = hist.map((d) => ({
        date: d.date,
        dots: slots.map((p) => {
          const ticked = p.steps.filter((s) => d.checks?.[s.id]).length;
          if (d.submissions?.[p.id] || d.phases?.[p.id]?.doneAt || (ticked > 0 && ticked === p.steps.length)) return "done" as const;
          return ticked > 0 ? ("partial" as const) : ("missed" as const);
        }),
      }));
      const filled = grid.flatMap((g) => g.dots).filter((x) => x === "done").length;
      const score = Math.round((filled / (grid.length * slots.length)) * 100);
      const lines = role.targets.map((t) => {
        const have = today.counts[t.id] || 0;
        const want = targetAt(t, cp);
        return { t, have, want, pct: pct(have, want), gap: Math.max(0, want - have) };
      });
      const avg = Math.round(lines.reduce((a, l) => a + Math.min(150, l.pct), 0) / lines.length);
      const presRec = presenceFor(e.id);
      return {
        e, role, grid, score, lines, avg,
        primary: [...lines].sort((a, b) => b.gap - a.gap)[0],
        pres: presRec,
        eff: effectiveState(presRec) as EffectiveState,
        dates: hist.map((d) => d.date),
      };
    });
  }, [hydrated, v, pv, cp]);

  const shown = roleFilter === "all" ? rows : rows.filter((r) => r.role.id === roleFilter);
  const dates = rows[0]?.dates || [];
  const floor = shown.reduce<Record<EffectiveState, number>>(
    (acc, x) => { acc[x.eff] = (acc[x.eff] || 0) + 1; return acc; },
    { active: 0, idle: 0, away: 0, break: 0, offline: 0 },
  );
  const orgAvg = shown.length ? Math.round(shown.reduce((a, x) => a + x.avg, 0) / shown.length) : 0;
  const atRisk = shown.filter((x) => x.avg < 90);

  function exportCsv() {
    const head = ["Person", "Role", "Presence", "Achievement %", "Compliance %", "Primary gap"];
    const lines = shown.map((x) => [
      x.e.name, x.role.name, PRESENCE_META[x.eff].label, x.avg, x.score,
      x.primary.gap > 0 ? `${x.primary.gap} ${x.primary.t.label}` : "none",
    ].join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `execution-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!hydrated) return <div className="p-6 text-sm text-muted-foreground">Loading live reports…</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Reporting</div>
          <h1 className="font-display text-2xl font-semibold">Live reports</h1>
          <p className="text-sm text-muted-foreground">Everyone, every checkpoint, in one screen.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">{CHECKPOINT_LABEL[cp]}</Badge>
          <Badge variant="outline" className={BAND_META[bandFor(orgAvg)].tone}>Org {orgAvg}%</Badge>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...CORE_ROLES.map((r) => r.id)] as const).map((id) => (
          <button
            key={id}
            onClick={() => setRoleFilter(id as "all" | CoreRole["id"])}
            className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
              roleFilter === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {id === "all" ? "All roles" : CORE_ROLES.find((r) => r.id === id)!.name}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Floor right now</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(["active", "idle", "break", "away", "offline"] as EffectiveState[]).map((s) => (
            <div key={s} className={`rounded-md border p-3 ${PRESENCE_META[s].tone}`}>
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest">
                <span className={`h-2 w-2 rounded-full ${PRESENCE_META[s].dot}`} />{PRESENCE_META[s].label}
              </div>
              <div className="font-display text-2xl font-semibold mt-1">{floor[s] || 0}</div>
            </div>
          ))}
          <div className="rounded-md border border-destructive/40 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-destructive">
              <AlertTriangle className="h-3 w-3" /> Below pace
            </div>
            <div className="font-display text-2xl font-semibold mt-1">{atRisk.length}</div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="grid">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="grid">Compliance grid</TabsTrigger>
          <TabsTrigger value="today">Today's numbers</TabsTrigger>
          <TabsTrigger value="floor">Floor</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-5">
          <Card className="p-5">
            <div className="font-medium mb-3">Compliance grid — who reported when</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Person</th>
                    {dates.map((d) => <th key={d} className="px-2">{d.slice(5)}</th>)}
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[...shown].sort((a, b) => b.score - a.score).map((x) => (
                    <tr key={x.e.id} className="border-t border-border">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{x.e.name}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{x.role.name}</div>
                      </td>
                      {x.grid.map((g) => (
                        <td key={g.date} className="px-2">
                          <div className="flex gap-1">
                            {g.dots.map((d, i) => (
                              <span
                                key={i}
                                title={d}
                                className={`h-2 w-2 rounded-full ${
                                  d === "done" ? "bg-success" : d === "partial" ? "bg-warning" : "bg-destructive/60"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                      ))}
                      <td>
                        <Badge variant="outline" className={BAND_META[bandFor(x.score)].tone}>{x.score}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> report submitted</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> steps ticked, no report</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive/60" /> nothing filed</span>
              <span>Four dots per day: Lock-In · Pace Block · Acceleration · Impact</span>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="today" className="mt-5 space-y-4">
          {CORE_ROLES.filter((r) => roleFilter === "all" || r.id === roleFilter).map((role) => {
            const people = shown.filter((x) => x.role.id === role.id);
            if (people.length === 0) return null;
            return (
              <Card key={role.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">{role.name}</div>
                  <Link to="/flow/$role" params={{ role: role.id }} className="text-xs text-primary">Open flow →</Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                        <th className="py-2">Person</th>
                        {role.targets.map((t) => <th key={t.id}>{t.label}</th>)}
                        <th>Primary gap</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...people].sort((a, b) => b.avg - a.avg).map((x) => (
                        <tr key={x.e.id} className="border-t border-border">
                          <td className="py-2 font-medium">{x.e.name}</td>
                          {x.lines.map((l) => (
                            <td key={l.t.id} className="whitespace-nowrap">
                              {l.have}<span className="text-muted-foreground">/{l.want}</span>
                              <Progress value={Math.min(100, l.pct)} className="h-1 mt-1 w-20" />
                            </td>
                          ))}
                          <td>{x.primary.gap > 0 ? `${x.primary.gap} ${x.primary.t.label}` : "—"}</td>
                          <td><Badge variant="outline" className={BAND_META[bandFor(x.avg)].tone}>{BAND_META[bandFor(x.avg)].label} · {x.avg}%</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="floor" className="mt-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 font-medium mb-3"><Activity className="h-4 w-4 text-primary" /> Who is working, who is idle</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Person</th><th>Role</th><th>Presence</th><th>For</th><th>Achievement</th>
                  </tr>
                </thead>
                <tbody>
                  {[...shown]
                    .sort((a, b) => ["active", "idle", "break", "away", "offline"].indexOf(a.eff) - ["active", "idle", "break", "away", "offline"].indexOf(b.eff))
                    .map((x) => (
                      <tr key={x.e.id} className="border-t border-border">
                        <td className="py-2 font-medium">{x.e.name}</td>
                        <td className="text-muted-foreground">{x.role.name}</td>
                        <td>
                          <Badge variant="outline" className={PRESENCE_META[x.eff].tone}>
                            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${PRESENCE_META[x.eff].dot}`} />
                            {PRESENCE_META[x.eff].label}
                          </Badge>
                        </td>
                        <td className="font-mono text-xs">{fmtSince(x.pres.since)}</td>
                        <td><Badge variant="outline" className={BAND_META[bandFor(x.avg)].tone}>{x.avg}%</Badge></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-[11px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {shown.length} people in view
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}