import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CORE_ROLES } from "@/lib/execution/core-roles";
import { ArrowRight, Target } from "lucide-react";

export const Route = createFileRoute("/flow/")({
  head: () => ({
    meta: [
      { title: "Role Daily Flows · 100X Operating System" },
      { name: "description", content: "Four core roles — Control Tower, Flow Ops, Tour Conversion Manager, Closing Specialist — with locked daily targets, playbooks and analytics." },
      { property: "og:title", content: "Role Daily Flows · 100X Operating System" },
      { property: "og:description", content: "Locked P1/P2/EOD targets, weighted KRAs, enforcement bands and incentives for every core role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlowIndex,
});

function FlowIndex() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Role daily flows</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The playbook is consolidated into four core roles. Similar roles are merged — one owner, one result, one set of locked targets.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {CORE_ROLES.map((r) => (
          <Card key={r.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold">{r.name}</div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{r.department}</div>
              </div>
              <Badge variant="outline"><Target className="h-3 w-3 mr-1" />{r.targets.map((t) => `${t.eod} ${t.label}`).join(" · ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{r.finalResult}</p>
            <div className="text-xs text-muted-foreground">
              Absorbs: {r.absorbs.join(", ")}
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
