import { createFileRoute } from "@tanstack/react-router";
import { useState, useSyncExternalStore, useEffect } from "react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { SelfieCapture } from "@/components/SelfieCapture";
import { WhatsAppUpload } from "@/components/execution/WhatsAppUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  subscribeExec, getExecVersion, getDay, submitLogin, submitMission,
  submitBaseline, submitBreak, submitResume, submitImpact, enterGate,
  logKpi, undoKpi, flagSla, getKpiTotals, computeScorecard,
  KPI_META, STAGE_META, STAGE_ORDER, stageIndex,
  type KpiKind, type Stage, type Mission,
} from "@/lib/execution-os-store";
import {
  Sun, Coffee, Play, MoonStar, Check, Lock, Zap, Target,
  MessageSquare, Trophy, Flag, Battery, Camera, Timer as TimerIcon,
  Sparkles, TrendingUp, Star,
} from "lucide-react";

export const Route = createFileRoute("/daily-legacy")({
  head: () => ({
    meta: [
      { title: "Execution OS — Gharpayy Arena" },
      { name: "description", content: "One connected day: mission → baseline → three execution blocks with selfies, WhatsApp proofs, live KPIs, and an AI scorecard at 8 PM." },
    ],
  }),
  component: DailyPage,
});

function DailyPage() {
  const { actor } = useAttendanceState();
  useSyncExternalStore(subscribeExec, getExecVersion, () => 0);
  const rec = getDay(actor.id);
  const totals = getKpiTotals(rec);

  const idx = stageIndex(rec.stage);
  const pct = Math.round((idx / (STAGE_ORDER.length - 1)) * 100);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <header className="space-y-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Execution OS · One connected day</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              {actor.name.split(" ")[0]}'s Mission · {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Each stage unlocks the next. Selfie in, declare your mission, prove progress with WhatsApp screenshots at every break, close the day with impact.
            </p>
          </div>
          <Badge variant="outline" className="text-sm py-1 px-3 font-mono">
            Stage {idx + 1} / {STAGE_ORDER.length} · {STAGE_META[rec.stage].label}
          </Badge>
        </div>
        <Progress value={pct} className="h-2" />
      </header>

      {/* Live KPI ribbon during blocks */}
      {(rec.stage === "block1" || rec.stage === "block2" || rec.stage === "block3") && (
        <BlockPanel rec={rec} totals={totals} />
      )}

      {/* Stage stepper */}
      <div className="space-y-3">
        <StageCard rec={rec} stage="login">
          <LoginStage rec={rec} />
        </StageCard>
        <StageCard rec={rec} stage="mission">
          <MissionStage rec={rec} />
        </StageCard>
        <StageCard rec={rec} stage="baseline">
          <BaselineStage rec={rec} />
        </StageCard>
        <StageCard rec={rec} stage="block1" title="Block 1 · Execute (10:40–13:15)" note={rec.stage === "block1" ? "Log calls, tours, chats above. When ready for lunch, hit End Block." : undefined}>
          {rec.stage === "block1" && (
            <Button className="w-full" onClick={() => enterGate(actor.id, "break1")}>
              End Block 1 · Start lunch break
            </Button>
          )}
        </StageCard>
        <StageCard rec={rec} stage="break1">
          <BreakStage rec={rec} which="break1" waLabel="Initial Update — vs morning baseline" />
        </StageCard>
        <StageCard rec={rec} stage="resume1">
          <ResumeStage rec={rec} which="resume1" />
        </StageCard>
        <StageCard rec={rec} stage="block2" title="Block 2 · Execute (13:30–17:00)">
          {rec.stage === "block2" && (
            <Button className="w-full" onClick={() => enterGate(actor.id, "break2")}>
              End Block 2 · Start snacks break
            </Button>
          )}
        </StageCard>
        <StageCard rec={rec} stage="break2">
          <BreakStage rec={rec} which="break2" waLabel="On-It Update — vs 1 PM" />
        </StageCard>
        <StageCard rec={rec} stage="resume2">
          <ResumeStage rec={rec} which="resume2" />
        </StageCard>
        <StageCard rec={rec} stage="block3" title="Block 3 · Final Push (17:20–20:00)">
          {rec.stage === "block3" && (
            <Button className="w-full" onClick={() => enterGate(actor.id, "impact")}>
              End Day · Submit impact
            </Button>
          )}
        </StageCard>
        <StageCard rec={rec} stage="impact">
          <ImpactStage rec={rec} />
        </StageCard>
        <StageCard rec={rec} stage="done">
          <DoneStage rec={rec} />
        </StageCard>
      </div>
    </div>
  );
}

// ------- Shared stage card wrapper -------
function StageCard({ rec, stage, title, note, children }: { rec: ReturnType<typeof getDay>; stage: Stage; title?: string; note?: string; children: React.ReactNode }) {
  const cur = stageIndex(rec.stage);
  const my  = stageIndex(stage);
  const done = my < cur;
  const active = my === cur;
  const locked = my > cur;
  const meta = STAGE_META[stage];

  return (
    <Card className={`p-5 transition-all ${active ? "ring-2 ring-primary shadow-lg" : ""} ${locked ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {done ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-4 w-4" /> : <span className="text-xs font-mono">{my + 1}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-display font-semibold">{title || meta.label}</h3>
            <span className="text-xs text-muted-foreground font-mono">{meta.time}</span>
          </div>
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
      </div>
      {active && <div className="mt-4">{children}</div>}
      {done && <StageProof rec={rec} stage={stage} />}
    </Card>
  );
}

function StageProof({ rec, stage }: { rec: ReturnType<typeof getDay>; stage: Stage }) {
  const selfie = rec.selfies[stage];
  const waKey = STAGE_META[stage].needsWa;
  const wa = waKey ? rec.whatsapp[waKey] : undefined;
  if (!selfie && !wa) return null;
  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {selfie && (
        <div className="relative">
          <img src={selfie.data} alt="Selfie" className="h-14 w-14 rounded-md object-cover ring-1 ring-border" />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5"><Check className="h-2.5 w-2.5 text-white" /></div>
        </div>
      )}
      {wa && (
        <div className="relative group">
          <img src={wa.data} alt="WA" className="h-14 w-14 rounded-md object-cover ring-1 ring-border" />
          <div className="absolute -bottom-1 -right-1 bg-primary rounded-full px-1.5 text-[10px] text-primary-foreground font-mono">{wa.unread}</div>
        </div>
      )}
    </div>
  );
}

// ------- Stage: Login -------
function LoginStage({ rec }: { rec: ReturnType<typeof getDay> }) {
  const { actor } = useAttendanceState();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
        <Sun className="h-5 w-5 text-amber-500" />
        <div className="text-sm">
          <div className="font-medium">Live selfie to start the day</div>
          <div className="text-xs text-muted-foreground">Time, location and device are captured with your selfie.</div>
        </div>
      </div>
      <Button onClick={() => setOpen(true)} className="w-full"><Camera className="h-4 w-4 mr-2" /> Take login selfie</Button>
      <SelfieCapture
        open={open}
        title="Mission Start"
        subtitle="Log in for the day"
        onClose={() => setOpen(false)}
        onCapture={(data) => {
          submitLogin(actor.id, { data, ts: Date.now() });
          setOpen(false);
          toast.success("Mission started — declare today's plan");
        }}
      />
    </div>
  );
}

// ------- Stage: Mission -------
function MissionStage({ rec }: { rec: ReturnType<typeof getDay> }) {
  const { actor } = useAttendanceState();
  const [p1, setP1] = useState(""); const [p2, setP2] = useState(""); const [p3, setP3] = useState("");
  const [goal, setGoal] = useState(""); const [risk, setRisk] = useState(""); const [finish, setFinish] = useState("20:00");
  const [energy, setEnergy] = useState<Mission["energy"]>(3);
  const [callsG, setCallsG] = useState(70);
  const [toursG, setToursG] = useState(10);
  const [prebooksG, setPrebooksG] = useState(3);
  const [moveinsG, setMoveinsG] = useState(1);

  const submit = () => {
    if (!p1 || !p2 || !p3 || !goal) { toast.error("All 3 priorities + goal are required"); return; }
    submitMission(actor.id, { priorities: [p1, p2, p3], goal, risk, expectedFinish: finish, energy },
      { call: callsG, tour_sched: toursG, prebook: prebooksG, movein: moveinsG });
    toast.success("Mission locked · upload WhatsApp baseline next");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1,2,3,4].map((v) => (
          <button key={v} onClick={() => setEnergy(v as Mission["energy"])}
            className={`p-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-all ${energy === v ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/50"}`}>
            <Battery className="h-4 w-4" /> {["Low","OK","Good","Peak"][v-1]}
          </button>
        )).slice(0,4)}
      </div>
      <div>
        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2 mb-2"><Target className="h-3.5 w-3.5" /> Top 3 priorities today</Label>
        <div className="space-y-2">
          <Input placeholder="Priority 1 (most important)" value={p1} onChange={(e) => setP1(e.target.value)} />
          <Input placeholder="Priority 2" value={p2} onChange={(e) => setP2(e.target.value)} />
          <Input placeholder="Priority 3" value={p3} onChange={(e) => setP3(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Measurable goal for today</Label>
        <Textarea placeholder="e.g. 70 connected calls, 10 tours scheduled, 3 prebooks" value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Biggest risk</Label><Input value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="What could derail today?" /></div>
        <div><Label className="text-xs">Expected finish</Label><Input value={finish} onChange={(e) => setFinish(e.target.value)} /></div>
      </div>
      <div>
        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2 block">Target numbers</Label>
        <div className="grid grid-cols-4 gap-2">
          <NumField label="Calls" value={callsG} onChange={setCallsG} />
          <NumField label="Tours" value={toursG} onChange={setToursG} />
          <NumField label="Prebooks" value={prebooksG} onChange={setPrebooksG} />
          <NumField label="Move-ins" value={moveinsG} onChange={setMoveinsG} />
        </div>
      </div>
      <Button onClick={submit} className="w-full"><Flag className="h-4 w-4 mr-2" /> Lock mission</Button>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="text-center font-mono" />
    </div>
  );
}

// ------- Stage: Baseline -------
function BaselineStage({ rec }: { rec: ReturnType<typeof getDay> }) {
  const { actor } = useAttendanceState();
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Freeze today's starting position. This becomes the yardstick every later update is compared against.</div>
      <WhatsAppUpload
        onSubmit={(data, unread) => {
          submitBaseline(actor.id, { data, unread, ts: Date.now() });
          toast.success("Baseline set · Block 1 starts now");
        }}
        submitLabel="Set baseline · Start Block 1"
      />
    </div>
  );
}

// ------- Live block panel -------
function BlockPanel({ rec, totals }: { rec: ReturnType<typeof getDay>; totals: Record<KpiKind, number> }) {
  const { actor } = useAttendanceState();
  const [slaOpen, setSlaOpen] = useState(false);
  const [slaChat, setSlaChat] = useState(""); const [slaHours, setSlaHours] = useState(2);

  const goalPct = rec.goals.call ? Math.round((totals.call / rec.goals.call) * 100) : 0;

  return (
    <Card className="p-4 md:p-5 space-y-4 border-primary/40 bg-primary/5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TimerIcon className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm">Live KPI · tap to log</span>
        </div>
        <div className="text-xs font-mono text-muted-foreground">Goal {goalPct}%</div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {(Object.keys(KPI_META) as KpiKind[]).map((k) => (
          <KpiChip key={k} kind={k} count={totals[k]} goal={rec.goals[k]}
            onInc={() => logKpi(actor.id, k)}
            onDec={() => undoKpi(actor.id, k)} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <div className="flex items-center gap-2 text-xs">
          <Flag className={`h-4 w-4 ${rec.slaBreaches.length ? "text-red-500" : "text-muted-foreground"}`} />
          <span>{rec.slaBreaches.length} SLA breach{rec.slaBreaches.length === 1 ? "" : "es"}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSlaOpen((v) => !v)}>Flag chat &gt; 2h</Button>
      </div>
      {slaOpen && (
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label className="text-xs">Chat / customer</Label><Input value={slaChat} onChange={(e) => setSlaChat(e.target.value)} /></div>
          <div className="w-20"><Label className="text-xs">Hours</Label><Input type="number" value={slaHours} min={2} step={0.5} onChange={(e) => setSlaHours(Number(e.target.value))} /></div>
          <Button onClick={() => { if (slaChat) { flagSla(actor.id, slaChat, slaHours); setSlaChat(""); setSlaOpen(false); toast.error("SLA flagged — resolve fast"); } }}>Flag</Button>
        </div>
      )}
    </Card>
  );
}

function KpiChip({ kind, count, goal, onInc, onDec }: { kind: KpiKind; count: number; goal?: number; onInc: () => void; onDec: () => void }) {
  const meta = KPI_META[kind];
  const pct = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0;
  return (
    <div className="rounded-lg border bg-background p-2 flex flex-col items-stretch gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{meta.short}</span>
        <span className="text-xs font-mono">{count}{goal ? `/${goal}` : ""}</span>
      </div>
      {goal ? <div className="h-1 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div> : <div className="h-1" />}
      <div className="flex gap-1 mt-1">
        <button onClick={onDec} className="flex-1 text-xs py-1 rounded bg-muted hover:bg-muted/80">−</button>
        <button onClick={onInc} className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:opacity-90 font-medium">+1</button>
      </div>
    </div>
  );
}

// ------- Break stages -------
function BreakStage({ rec, which, waLabel }: { rec: ReturnType<typeof getDay>; which: "break1" | "break2"; waLabel: string }) {
  const { actor } = useAttendanceState();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [win, setWin] = useState(""); const [blocker, setBlocker] = useState(""); const [next, setNext] = useState("");
  const compareTo = which === "break1"
    ? rec.whatsapp.baseline && { unread: rec.whatsapp.baseline.unread, label: "baseline" }
    : rec.whatsapp.initial && { unread: rec.whatsapp.initial.unread, label: "1 PM" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setSelfieOpen(true)} className="flex-1"><Camera className="h-4 w-4 mr-2" /> {selfie ? "Retake break selfie" : "Take break selfie"}</Button>
        {selfie && <img src={selfie} className="h-10 w-10 rounded-md object-cover ring-1 ring-border" />}
      </div>
      <SelfieCapture open={selfieOpen} title={`${which === "break1" ? "Lunch" : "Snacks"} break`} onClose={() => setSelfieOpen(false)} onCapture={(d) => { setSelfie(d); setSelfieOpen(false); }} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div><Label className="text-xs">Biggest win so far</Label><Textarea value={win} onChange={(e) => setWin(e.target.value)} rows={2} /></div>
        <div><Label className="text-xs">Biggest blocker</Label><Textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={2} /></div>
        <div><Label className="text-xs">Next priority</Label><Textarea value={next} onChange={(e) => setNext(e.target.value)} rows={2} /></div>
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono mt-4">{waLabel}</div>
      <WhatsAppUpload
        compareTo={compareTo || undefined}
        onSubmit={(data, unread) => {
          if (!selfie) { toast.error("Selfie required to start break"); return; }
          submitBreak(actor.id, which, {
            selfie: { data: selfie, ts: Date.now() },
            wa: { data, unread, ts: Date.now() },
            body: { win, blocker, nextPriority: next, ts: Date.now() },
          });
          toast.success("Update submitted · enjoy your break");
        }}
        submitLabel="Submit update · Start break"
      />
    </div>
  );
}

// ------- Resume stages -------
function ResumeStage({ rec, which }: { rec: ReturnType<typeof getDay>; which: "resume1" | "resume2" }) {
  const { actor } = useAttendanceState();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Take a resume selfie to unlock the next block.</div>
      <Button className="w-full" onClick={() => setOpen(true)}><Play className="h-4 w-4 mr-2" /> Resume selfie</Button>
      <SelfieCapture open={open} title="Break over" subtitle="Resume execution" onClose={() => setOpen(false)}
        onCapture={(d) => { submitResume(actor.id, which, { data: d, ts: Date.now() }); setOpen(false); toast.success("Back at it — next block is live"); }} />
    </div>
  );
}

// ------- Impact stage -------
function ImpactStage({ rec }: { rec: ReturnType<typeof getDay> }) {
  const { actor } = useAttendanceState();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [win, setWin] = useState(""); const [learning, setLearning] = useState(""); const [mistake, setMistake] = useState(""); const [tomorrow, setTomorrow] = useState("");
  const compareTo = rec.whatsapp.onit && { unread: rec.whatsapp.onit.unread, label: "5 PM" };

  const submit = (data: string, unread: number) => {
    if (!selfie) { toast.error("Final selfie required"); return; }
    if (!win || !tomorrow) { toast.error("Win + tomorrow's priority required"); return; }
    submitImpact(actor.id, {
      selfie: { data: selfie, ts: Date.now() },
      wa: { data, unread, ts: Date.now() },
      body: { win, learning, mistake, tomorrowPriority: tomorrow, ts: Date.now() },
    });
    toast.success("Day closed · scorecard ready");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setSelfieOpen(true)} className="flex-1"><Camera className="h-4 w-4 mr-2" /> {selfie ? "Retake final selfie" : "Take final selfie"}</Button>
        {selfie && <img src={selfie} className="h-10 w-10 rounded-md object-cover ring-1 ring-border" />}
      </div>
      <SelfieCapture open={selfieOpen} title="Impact submit" onClose={() => setSelfieOpen(false)} onCapture={(d) => { setSelfie(d); setSelfieOpen(false); }} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div><Label className="text-xs">Biggest win today *</Label><Textarea value={win} onChange={(e) => setWin(e.target.value)} rows={2} /></div>
        <div><Label className="text-xs">Biggest learning</Label><Textarea value={learning} onChange={(e) => setLearning(e.target.value)} rows={2} /></div>
        <div><Label className="text-xs">Mistake to avoid</Label><Textarea value={mistake} onChange={(e) => setMistake(e.target.value)} rows={2} /></div>
        <div><Label className="text-xs">Tomorrow's first priority *</Label><Textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} rows={2} /></div>
      </div>
      <WhatsAppUpload onSubmit={submit} compareTo={compareTo || undefined} submitLabel="Submit impact · Close day" />
    </div>
  );
}

// ------- Done -------
function DoneStage({ rec }: { rec: ReturnType<typeof getDay> }) {
  const totals = getKpiTotals(rec);
  const sc = rec.scorecard || computeScorecard(rec);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <Trophy className="h-8 w-8 text-emerald-500" />
        <div>
          <div className="font-display text-lg font-semibold">Day closed · {sc.points} pts</div>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < sc.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniKpi label="Calls" have={totals.call} want={rec.goals.call} />
        <MiniKpi label="Tours" have={totals.tour_sched} want={rec.goals.tour_sched} />
        <MiniKpi label="Prebooks" have={totals.prebook} want={rec.goals.prebook} />
        <MiniKpi label="Move-ins" have={totals.movein} want={rec.goals.movein} />
        <MiniKpi label="Chats" have={totals.chat} />
        <MiniKpi label="SLA breaches" have={rec.slaBreaches.length} />
      </div>
      <div className="space-y-1.5">
        {sc.breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-2">
              {b.ok ? <Check className="h-4 w-4 text-emerald-500" /> : <span className="h-4 w-4 rounded-full border" />}
              <span className={b.ok ? "" : "text-muted-foreground"}>{b.label}</span>
            </div>
            <span className={`font-mono text-xs ${b.ok ? "text-emerald-500" : "text-muted-foreground"}`}>+{b.value}</span>
          </div>
        ))}
      </div>
      {rec.tomorrowPriority && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-sm"><span className="text-muted-foreground">Tomorrow's first priority — </span><span className="font-medium">{rec.tomorrowPriority}</span></div>
        </div>
      )}
    </div>
  );
}

function MiniKpi({ label, have, want }: { label: string; have: number; want?: number }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</div>
      <div className="font-mono text-lg font-semibold">{have}{want ? <span className="text-xs text-muted-foreground">/{want}</span> : null}</div>
    </div>
  );
}