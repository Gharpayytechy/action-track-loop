import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { SelfieCapture } from "@/components/SelfieCapture";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FLOW_META,
  FLOW_ORDER,
  FlowStepId,
  flowProgress,
  isStepUnlocked,
  submitStep,
  subscribeFlow,
} from "@/lib/daily-flow-store";
import { toast } from "sonner";
import {
  Sun, Coffee, Play, MoonStar, Image as ImgIcon, Check, Lock, Loader2,
  MapPin, Camera, MessageSquare, Sparkles, Target,
} from "lucide-react";
import { fmtTime } from "@/lib/attendance-store";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Flow — Gharpayy Arena" },
      { name: "description", content: "One interconnected daily script: selfie in, plan, mid-day updates with WhatsApp screenshots, final impact submit." },
    ],
  }),
  component: DailyPage,
});

const ICONS: Record<FlowStepId, any> = {
  start: Sun,
  midday_break: Coffee,
  midday_resume: Play,
  evening_break: Coffee,
  evening_resume: Play,
  eod: MoonStar,
};

function DailyPage() {
  const { actor } = useAttendanceState();
  useSyncExternalStore(subscribeFlow, () => Date.now().toString(), () => "ssr");
  const { flow, done, total, pct } = flowProgress(actor.id);

  const [openStep, setOpenStep] = useState<FlowStepId | null>(null);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Daily Flow · One script per day</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Today · {actor.name.split(" ")[0]}'s Playbook</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Six interconnected checkpoints from clock-in to EOD. Each one wants your selfie, your notes,
            and a WhatsApp screenshot when it matters — nothing gets skipped, everything ties back.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Progress</div>
          <div className="font-display text-3xl font-semibold tabular-nums">{done}<span className="text-muted-foreground text-lg">/{total}</span></div>
          <div className="h-1.5 w-40 mt-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      {flow.plan && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Target className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <div className="text-[10px] uppercase tracking-widest font-mono text-primary">Today's Plan</div>
              <div className="text-sm mt-1 whitespace-pre-wrap">{flow.plan}</div>
            </div>
          </div>
        </Card>
      )}

      <ol className="relative border-l border-border ml-4 space-y-4">
        {FLOW_ORDER.map((id, idx) => {
          const meta = FLOW_META[id];
          const step = flow.steps[id];
          const unlocked = isStepUnlocked(actor.id, id);
          const Icon = ICONS[id];
          const state: "done" | "open" | "locked" = step ? "done" : unlocked ? "open" : "locked";
          return (
            <li key={id} className="ml-6 relative">
              <span className={`absolute -left-[38px] h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                state === "done" ? "bg-success/20 border-success text-success"
                : state === "open" ? "bg-primary/20 border-primary text-primary animate-pulse"
                : "bg-muted border-border text-muted-foreground"
              }`}>
                {state === "done" ? <Check className="h-4 w-4" /> : state === "locked" ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-4 w-4" />}
              </span>
              <Card className={`p-4 md:p-5 ${state === "open" ? "border-primary/50 shadow-md" : ""}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display font-semibold">{meta.label}</h3>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">Target {meta.time}</Badge>
                      {step && <Badge className="bg-success/15 text-success border-success/30 border font-mono text-[10px] uppercase tracking-widest">Logged {fmtTime(step.ts)}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-xl">{describeStep(id)}</p>
                  </div>
                  <div>
                    {state === "open" && (
                      <Button onClick={() => setOpenStep(id)}>
                        <Camera className="h-4 w-4 mr-2" /> Do this step
                      </Button>
                    )}
                    {state === "locked" && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Complete previous step first</span>
                    )}
                  </div>
                </div>

                {step && (
                  <div className="mt-4 grid md:grid-cols-[120px_1fr] gap-4">
                    {step.selfie && (
                      <img src={step.selfie} alt="selfie" className="h-28 w-28 rounded-md object-cover border border-border" />
                    )}
                    <div className="space-y-2 min-w-0">
                      {step.address && (
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {step.address}</div>
                      )}
                      {(step.callsMade != null || step.toursBooked != null) && (
                        <div className="flex gap-4 text-xs">
                          {step.callsMade != null && <span><span className="font-mono uppercase tracking-widest text-muted-foreground text-[10px]">Calls</span> <b className="tabular-nums">{step.callsMade}</b></span>}
                          {step.toursBooked != null && <span><span className="font-mono uppercase tracking-widest text-muted-foreground text-[10px]">Tours</span> <b className="tabular-nums">{step.toursBooked}</b></span>}
                        </div>
                      )}
                      {step.notes && (
                        <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-2 border border-border">
                          <MessageSquare className="h-3 w-3 inline mr-1 text-muted-foreground" />
                          {step.notes}
                        </div>
                      )}
                      {step.screenshots.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {step.screenshots.map((s, i) => (
                            <a key={i} href={s} target="_blank" rel="noreferrer">
                              <img src={s} alt="wa ss" className="h-20 w-20 object-cover rounded border border-border hover:border-primary transition" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      {done === total && (
        <Card className="p-5 border-success/40 bg-success/5 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-success" />
          <div>
            <div className="font-display font-semibold">Day locked in — full script complete.</div>
            <div className="text-xs text-muted-foreground">All six checkpoints have selfies + updates. Consistency streak counted.</div>
          </div>
        </Card>
      )}

      {openStep && (
        <StepDialog
          stepId={openStep}
          employeeId={actor.id}
          onClose={() => setOpenStep(null)}
        />
      )}
    </div>
  );
}

function describeStep(id: FlowStepId): string {
  switch (id) {
    case "start": return "Selfie + geo login. Type your plan for today so managers and the console know what you're chasing.";
    case "midday_break": return "Break at ~1:15. Selfie, quick progress note (call count, tours booked), and drop the WhatsApp screenshot of your first-half updates.";
    case "midday_resume": return "Back from lunch. Selfie only — resumes your work timer for the 2:00–5:00 block.";
    case "evening_break": return "Break at ~5:20. Selfie + evening progress note + WhatsApp screenshot of the mid-day update thread.";
    case "evening_resume": return "Final push begins. Selfie only.";
    case "eod": return "By ~8:00 PM: selfie, final impact summary, and the closing WhatsApp screenshot. This locks the day and awards streak XP.";
  }
}

function StepDialog({ stepId, employeeId, onClose }: { stepId: FlowStepId; employeeId: string; onClose: () => void }) {
  const meta = FLOW_META[stepId];
  const [selfieOpen, setSelfieOpen] = useState(true);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [calls, setCalls] = useState<string>("");
  const [tours, setTours] = useState<string>("");
  const [shots, setShots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, 4).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setShots((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const submit = async () => {
    if (!selfie) { toast.error("Selfie required"); return; }
    if (meta.needsUpdate && !notes.trim()) { toast.error("Progress note required"); return; }
    if (meta.needsScreenshot && shots.length === 0) { toast.error("Attach at least one WhatsApp screenshot"); return; }
    if (meta.needsPlan && !plan.trim()) { toast.error("Today's plan is required"); return; }
    setSaving(true);
    try {
      await submitStep({
        employeeId,
        stepId,
        selfie,
        notes,
        plan: meta.needsPlan ? plan : undefined,
        callsMade: calls ? Number(calls) : undefined,
        toursBooked: tours ? Number(tours) : undefined,
        screenshots: shots,
      });
      toast.success(`${meta.label} logged`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SelfieCapture
        open={selfieOpen && !selfie}
        title={`Selfie · ${meta.label}`}
        subtitle="Face the camera. Geo will be captured on submit."
        onClose={() => { setSelfieOpen(false); if (!selfie) onClose(); }}
        onCapture={(s) => { setSelfie(s); setSelfieOpen(false); }}
      />

      {selfie && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl my-8">
            <div className="p-5 border-b border-border flex items-start justify-between">
              <div>
                <div className="font-display font-semibold">{meta.label}</div>
                <div className="text-xs text-muted-foreground">Everything below is stitched into today's flow.</div>
              </div>
              <img src={selfie} alt="selfie" className="h-14 w-14 rounded object-cover border border-border" />
            </div>

            <div className="p-5 space-y-4">
              {meta.needsPlan && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Today's Plan *</label>
                  <Textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Top 3 outcomes I'll ship today…" rows={3} className="mt-1" />
                </div>
              )}

              {meta.needsUpdate && (
                <>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Progress Update *</label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's been done. Numbers, blockers, next moves…" rows={4} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Calls made</label>
                      <Input type="number" min={0} value={calls} onChange={(e) => setCalls(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Tours booked</label>
                      <Input type="number" min={0} value={tours} onChange={(e) => setTours(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </>
              )}

              {meta.needsScreenshot && (
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">WhatsApp Screenshot(s) *</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {shots.map((s, i) => (
                      <div key={i} className="relative">
                        <img src={s} className="h-20 w-20 object-cover rounded border border-border" />
                        <button onClick={() => setShots(shots.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs">×</button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="h-20 w-20 rounded border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      <ImgIcon className="h-5 w-5" />
                      <span className="text-[10px] mt-1">Add</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={submit} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Submit & lock step"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
