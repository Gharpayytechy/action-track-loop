import { createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore, useState } from "react";
import { EMPLOYEES } from "@/data/seed";
import {
  subscribeExec, getExecVersion, getAllToday, getKpiTotals, riskOf,
  STAGE_META, stageIndex, STAGE_ORDER,
} from "@/lib/execution-os-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { Progress } from "@/components/ui/progress";
import { Radio, Filter, MessageSquare, Trophy, AlertTriangle, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Ops · Execution OS" },
      { name: "description", content: "Real-time wallboard of every operator's day — current stage, KPIs vs goal, WA proofs, SLA breaches, risk level." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  useSyncExternalStore(subscribeExec, getExecVersion, () => 0);
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<"all" | "red" | "amber" | "green">("all");

  const records = getAllToday();
  const byEmp = new Map(records.map((r) => [r.employeeId, r]));

  const roster = EMPLOYEES.filter((e) => e.appRole !== "admin" || e.role === "Admin");
  const rows = roster.map((e) => ({ emp: e, rec: byEmp.get(e.id) }))
    .filter(({ emp, rec }) => {
      if (q && !emp.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (risk !== "all") {
        const r = rec ? riskOf(rec) : "amber";
        if (r !== risk) return false;
      }
      return true;
    });

  const totalStarted = records.length;
  const totalDone = records.filter((r) => r.stage === "done").length;
  const totalRed = records.filter((r) => riskOf(r) === "red").length;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
            <span className="relative inline-flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
            Live Ops · updates in real time
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Floor Wallboard</h1>
          <p className="text-sm text-muted-foreground mt-1">One card per operator · current stage, live KPIs, proof thumbnails, risk level.</p>
        </div>
        <div className="flex gap-2">
          <StatChip icon={Radio}     label="Started"    value={totalStarted}   />
          <StatChip icon={Trophy}    label="Done"       value={totalDone}      tint="emerald" />
          <StatChip icon={AlertTriangle} label="At risk" value={totalRed}      tint="red" />
        </div>
      </header>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-[200px]"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search operator…" /></div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mx-1" />
          {(["all","red","amber","green"] as const).map((r) => (
            <button key={r} onClick={() => setRisk(r)}
              className={`text-xs px-2 py-1 rounded ${risk === r ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map(({ emp, rec }) => <OpCard key={emp.id} emp={emp} rec={rec} />)}
        {rows.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-lg">No operators match this filter.</div>
        )}
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, tint }: { icon: any; label: string; value: number; tint?: "emerald" | "red" }) {
  const c = tint === "emerald" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
          : tint === "red"     ? "text-red-500 bg-red-500/10 border-red-500/30"
          :                       "text-primary bg-primary/10 border-primary/30";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${c}`}>
      <Icon className="h-4 w-4" />
      <div><div className="text-[10px] uppercase tracking-widest font-mono opacity-70">{label}</div><div className="font-mono font-semibold leading-none">{value}</div></div>
    </div>
  );
}

function OpCard({ emp, rec }: { emp: typeof EMPLOYEES[number]; rec: ReturnType<typeof getAllToday>[number] | undefined }) {
  if (!rec) {
    return (
      <Card className="p-4 border-dashed opacity-70">
        <div className="flex items-center gap-3">
          <Avatar id={emp.id} name={emp.name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{emp.name}</div>
            <div className="text-xs text-muted-foreground">{emp.role} · not started</div>
          </div>
          <Badge variant="outline" className="text-xs">Offline</Badge>
        </div>
      </Card>
    );
  }

  const totals = getKpiTotals(rec);
  const risk = riskOf(rec);
  const riskColor = risk === "red" ? "bg-red-500" : risk === "amber" ? "bg-amber-500" : "bg-emerald-500";
  const idx = stageIndex(rec.stage);
  const stagePct = Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
  const goalPct = rec.goals.call ? Math.min(100, Math.round((totals.call / rec.goals.call) * 100)) : 0;

  const lastSelfie = Object.values(rec.selfies).slice(-1)[0];
  const lastWa = Object.values(rec.whatsapp).slice(-1)[0];
  const baselineUnread = rec.whatsapp.baseline?.unread;
  const currentUnread  = lastWa?.unread;
  const unreadDelta = baselineUnread !== undefined && currentUnread !== undefined ? currentUnread - baselineUnread : null;

  const lastEventAt = rec.kpiEvents.length ? rec.kpiEvents[rec.kpiEvents.length - 1].ts : rec.startedAt;
  const idleMin = lastEventAt ? Math.round((Date.now() - lastEventAt) / 60000) : 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="relative">
          {lastSelfie
            ? <img src={lastSelfie.data} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-border" />
            : <Avatar id={emp.id} name={emp.name} size={44} />}
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${riskColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{emp.name}</div>
          <div className="text-xs text-muted-foreground truncate">{emp.role} · {emp.team}</div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">{STAGE_META[rec.stage].label}</Badge>
      </div>

      <Progress value={stagePct} className="h-1" />

      <div className="grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Calls"    have={totals.call}       want={rec.goals.call} />
        <MiniStat label="Tours"    have={totals.tour_sched} want={rec.goals.tour_sched} />
        <MiniStat label="Prebooks" have={totals.prebook}    want={rec.goals.prebook} />
        <MiniStat label="Move-ins" have={totals.movein}     want={rec.goals.movein} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Goal {goalPct}%</div>
        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {idleMin} min idle</div>
        {unreadDelta !== null && (
          <div className={`flex items-center gap-1 ${unreadDelta > 0 ? "text-red-500" : "text-emerald-500"}`}>
            <MessageSquare className="h-3 w-3" /> {unreadDelta > 0 ? "+" : ""}{unreadDelta}
          </div>
        )}
      </div>

      {(lastWa || rec.slaBreaches.length > 0) && (
        <div className="flex items-center gap-2 pt-2 border-t">
          {lastWa && <img src={lastWa.data} className="h-10 w-10 rounded object-cover ring-1 ring-border" alt="WA" />}
          {rec.slaBreaches.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{rec.slaBreaches.length} SLA</Badge>
          )}
          {rec.stage === "done" && rec.scorecard && (
            <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-600">{rec.scorecard.points} pts · {rec.scorecard.stars}★</Badge>
          )}
        </div>
      )}
    </Card>
  );
}

function MiniStat({ label, have, want }: { label: string; have: number; want?: number }) {
  const pct = want ? Math.min(100, (have / want) * 100) : 0;
  const tone = !want ? "text-muted-foreground" : pct >= 100 ? "text-emerald-500" : pct >= 70 ? "text-foreground" : pct >= 30 ? "text-amber-500" : "text-red-500";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className={`font-mono text-sm font-semibold ${tone}`}>{have}{want ? <span className="text-[10px] text-muted-foreground">/{want}</span> : null}</div>
    </div>
  );
}