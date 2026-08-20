import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ROLE_FLOWS, phaseWorkFor } from "@/lib/execution/role-flows";
import { ArrowRight, Search, Target } from "lucide-react";

export const Route = createFileRoute("/flows")({
  head: () => ({
    meta: [
      { title: "All Role Flows · Gharpayy Execution OS" },
      { name: "description", content: "Every role's daily flow in one place — Tech, HR, Recruitment, Demand, Visit, Supply, CX and Leadership, all on the 10:35 → 1:15 → 2:00 → 5:00 → 8:00 rhythm." },
      { property: "og:title", content: "All Role Flows · Gharpayy Execution OS" },
      { property: "og:description", content: "Open any role's daily flow, KPIs and WhatsApp reporting rhythm in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlowsDirectory,
});

function FlowsDirectory() {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? ROLE_FLOWS.filter((f) =>
          (f.roleName + " " + f.department + " " + f.result + " " + f.match.join(" "))
            .toLowerCase()
            .includes(needle),
        )
      : ROLE_FLOWS;
    const map = new Map<string, typeof ROLE_FLOWS>();
    for (const f of list) {
      const arr = map.get(f.department) ?? [];
      arr.push(f);
      map.set(f.department, arr);
    }
    return Array.from(map.entries());
  }, [q]);

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">Role flow directory</div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold">All role flows</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Every role, one tap away. Each flow runs the same rhythm — 10:35 goal, 1:15 PM actuals,
          2:00 PM recovery, 5:00 PM actuals, 8:00 PM final impact — with its own KPIs and
          WhatsApp-ready updates.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tech, HR, recruitment, closing…"
          className="pl-9"
        />
      </div>

      {groups.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No role flow matches "{q}".
        </Card>
      )}

      {groups.map(([dept, flows]) => (
        <section key={dept} className="space-y-3">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{dept}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {flows.map((f) => {
              const work = phaseWorkFor(f);
              return (
                <Card key={f.roleId} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-display text-lg font-semibold leading-tight">{f.roleName}</div>
                    <Badge variant="outline" className="font-mono text-[10px]">{f.roleId}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{f.result}</p>
                  <div className="text-xs text-muted-foreground">
                    <Target className="h-3 w-3 inline mr-1" />
                    {f.metrics.length} KPIs · {work.length} timed phases
                  </div>
                  <Link
                    to="/flow/role/$id"
                    params={{ id: f.roleId }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                  >
                    Open role flow <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
