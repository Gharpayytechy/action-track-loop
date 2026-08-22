import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { SendUpdateButton } from "@/components/reporting/SendUpdateButton";
import { DownloadMenu } from "@/components/reporting/DownloadMenu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { biggestRisk, companyBlock, healthClass, zoneRows } from "@/lib/command-center/metrics";

export const Route = createFileRoute("/founder")({
  component: () => (
    <RoleGate allow={["leadership"]}>
      <FounderMode />
    </RoleGate>
  ),
  head: () => ({
    meta: [
      { title: "Founder Mode · Gharpayy Company Signal" },
      { name: "description", content: "Company result, people health, execution risk, zone status, today's biggest problem and the decisions only the founder can make." },
      { property: "og:title", content: "Founder Mode · Gharpayy Company Signal" },
      { property: "og:description", content: "Signal, not noise: BBD, presence, unassigned leads, waiting chats, zone health and a decision queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Decision = {
  id: string;
  title: string;
  evidence: string[];
  recommendation: string;
};

const DECISIONS: Decision[] = [
  {
    id: "d1",
    title: "Bellandur capacity",
    evidence: ["Demand up 34% over 7 working days", "Flow Ops overloaded 5 days running", "SLA slipping on customer replies"],
    recommendation: "Approve 2 additional Flow Ops hires.",
  },
  {
    id: "d2",
    title: "Owner pricing exception",
    evidence: ["4 bookings blocked on owner approval", "Two customers already paid deposits"],
    recommendation: "Approve a ₹X commercial threshold for zone managers.",
  },
  {
    id: "d3",
    title: "Whitefield reallocation",
    evidence: ["1.4 FTE excess capacity for 7 working days", "Queue healthy, SLA green"],
    recommendation: "Reallocate 1 person to Bellandur before hiring.",
  },
];

export default function FounderMode() {
  const block = useMemo(() => companyBlock(), []);
  const rows = useMemo(() => zoneRows(), []);
  const risk = biggestRisk(block);
  const [resolved, setResolved] = useState<Record<string, string>>({});

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary mb-1.5">Founder mode · live</div>
          <h1 className="font-display text-2xl md:text-4xl font-semibold tracking-tight">Gharpayy today</h1>
          <p className="text-muted-foreground text-sm mt-1">Signal only. Everything else is one click deeper.</p>
        </div>
        <div className="flex gap-2">
          <DownloadMenu label="Download" scope={{ kind: "company", zones: [] }} period="today" name="Founder pack" />
          <SendUpdateButton label="Share update" reportName="Founder pack" />
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Big label="BBD" value={`${block.closing.bookings}/${block.closing.bbdTarget}`} />
        <Big label="Tours completed" value={`${block.tours.completed}/${block.tours.scheduled}`} />
        <Big label="Present" value={`${block.people.present}/${block.people.expected}`} />
        <Big label="Productive" value={block.people.active} />
      </section>

      <section className="grid sm:grid-cols-3 gap-3 mb-6">
        <Mini label="Unassigned leads" value={block.demand.unassigned} bad={block.demand.unassigned > 0} />
        <Mini label="Chats waiting us" value={block.chats.waitingUs} bad={block.chats.waitingUs > 0} />
        <Mini label="SLA breaches" value={block.chats.slaBreached} bad={block.chats.slaBreached > 0} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Zones</div>
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <span key={r.zone} className={`text-xs px-2.5 py-1 rounded-full border ${healthClass(r.health)}`}>{r.zone}</span>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 md:p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-destructive mb-1">Today's biggest problem</div>
          <div className="font-display text-lg font-semibold">{risk.risk}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Action being taken</div>
          <div className="text-sm">{risk.action}</div>
        </div>
      </div>

      <section className="rounded-2xl border border-primary/30 bg-card overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-border">
          <h2 className="font-display text-lg font-semibold">Decisions needed from me</h2>
          <p className="text-xs text-muted-foreground">Maximum five. Everything else is management's job.</p>
        </div>
        <div className="divide-y divide-border">
          {DECISIONS.map((d) => (
            <div key={d.id} className="px-4 md:px-5 py-4">
              <div className="font-display text-base font-semibold mb-1">{d.title}</div>
              <ul className="text-[13px] text-muted-foreground list-disc pl-5 space-y-0.5 mb-2">
                {d.evidence.map((e) => <li key={e}>{e}</li>)}
              </ul>
              <div className="text-sm mb-3"><span className="text-muted-foreground">Recommendation: </span>{d.recommendation}</div>
              {resolved[d.id] ? (
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-success/30 bg-success/10 text-success">{resolved[d.id]}</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(["Approve", "Need more info", "Reject"] as const).map((a) => (
                    <Button key={a} size="sm" variant={a === "Approve" ? "default" : "outline"}
                      onClick={() => { setResolved((r) => ({ ...r, [d.id]: a })); toast.success(`${d.title}: ${a}`, { description: "Owner notified with your decision." }); }}>
                      {a}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 text-xs text-muted-foreground">
        Go deeper: <Link to="/admin/command-center" className="text-primary hover:underline">Zone Command Center</Link> ·{" "}
        <Link to="/admin/report-center" className="text-primary hover:underline">Report Center</Link>
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl md:text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Mini({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center justify-between">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${bad ? "text-destructive" : "text-success"}`}>{value}</span>
    </div>
  );
}
