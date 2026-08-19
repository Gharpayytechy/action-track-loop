import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useAttendanceState } from "@/hooks/useAttendance";
import {
  ROLE_FLOWS, ROLE_FLOW_ORDER, flowForEmployee, type RoleFlowKey,
} from "@/data/reporting-os";
import {
  ReportingOSPanel, ReportingHeaderStat, NowLine,
} from "@/components/execution/ReportingOS";
import { WhatsAppReportingThread } from "@/components/execution/WhatsAppReportingThread";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/reporting")({
  component: ReportingPage,
  head: () => ({
    meta: [
      { title: "Reporting OS — Day Flow | Gharpayy Arena" },
      { name: "description", content: "Morning-to-EOD reporting flow for Control Tower, Flow Ops, TCM and Closing: checkpoints, locked CRM fields and connected funnel handoffs." },
      { property: "og:title", content: "Reporting OS — Day Flow" },
      { property: "og:description", content: "Good Morning to 8 PM wrap-up reporting cadence for every operating role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ReportingPage() {
  const { actor } = useAttendanceState();
  const mine = flowForEmployee(actor.id);
  const [roleKey, setRoleKey] = useState<RoleFlowKey>(mine?.key ?? "control_tower");
  const [view, setView] = useState<"chat" | "board">("chat");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (mine) setRoleKey(mine.key);
  }, [mine?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const flow = ROLE_FLOWS[roleKey];

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
              Reporting OS · day flow
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
              {flow.title} <span className="text-muted-foreground font-normal">· {flow.subtitle}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{flow.mandate}</p>
            <div className="mt-2 inline-flex items-center gap-2 text-xs font-mono text-primary">
              {flow.handsOffTo} <ArrowRight className="h-3 w-3" />
            </div>
          </div>
          <ReportingHeaderStat actorId={actor.id} roleKey={roleKey} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {ROLE_FLOW_ORDER.map((k) => {
            const f = ROLE_FLOWS[k];
            const active = k === roleKey;
            return (
              <button
                key={k}
                onClick={() => setRoleKey(k)}
                className={`h-8 px-3 rounded-md text-xs font-mono uppercase tracking-widest border transition-colors ${
                  active
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {f.title}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <NowLine />
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "chat" | "board")}>
        <TabsList>
          <TabsTrigger value="chat">WhatsApp thread</TabsTrigger>
          <TabsTrigger value="board">Board view</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-4">
          {hydrated
            ? <WhatsAppReportingThread actorId={actor.id} roleKey={roleKey} />
            : <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading today's thread…</div>}
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <ReportingOSPanel actorId={actor.id} roleKey={roleKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
