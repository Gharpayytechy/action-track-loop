import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttendanceState } from "@/hooks/useAttendance";
import { EMPLOYEES } from "@/data/seed";
import {
  DAYOFF_LABEL, allPlans, cancelPlan, dayOffVersion, dayOffWindow, filePlan,
  nameOf, planFor, plansOn, subscribeDayOff, tomorrowKey, type DayOffKind,
} from "@/lib/dayoff-store";
import { CalendarOff, Clock, ShieldAlert, CheckCircle2, Users } from "lucide-react";

export const Route = createFileRoute("/planned-off")({
  head: () => ({
    meta: [
      { title: "Plan Tomorrow's Off · 12-Hour Rule" },
      { name: "description", content: "Declare tomorrow's week-off or planned leave inside the 12-hour window so the team can re-balance targets before the shift starts." },
      { property: "og:title", content: "Plan Tomorrow's Off · 12-Hour Rule" },
      { property: "og:description", content: "One day ahead, never later: file tomorrow's off, name your cover owner, and let the floor plan around it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannedOffPage,
});

function PlannedOffPage() {
  const { actor } = useAttendanceState();
  const [mounted, setMounted] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const v = useSyncExternalStore(subscribeDayOff, () => dayOffVersion(), () => 0);

  const [kind, setKind] = useState<DayOffKind>("week_off");
  const [reason, setReason] = useState("");
  const [cover, setCover] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const tk = tomorrowKey();
  const w = mounted ? dayOffWindow() : null;
  const mine = mounted ? (void v, planFor(actor.id, tk)) : undefined;
  const tomorrowTeam = useMemo(() => (mounted ? (void v, plansOn(tk)) : []), [mounted, v, tk]);
  const recent = useMemo(() => (mounted ? (void v, allPlans().slice(0, 12)) : []), [mounted, v]);

  const hrs = w ? Math.max(0, Math.floor(w.msToClose / 3_600_000)) : 0;
  const mins = w ? Math.max(0, Math.floor((w.msToClose % 3_600_000) / 60_000)) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Planning · 12-hour rule</div>
        <h1 className="font-display text-2xl font-semibold">Tomorrow's off</h1>
        <p className="text-sm text-muted-foreground">
          Tell us one day before — never earlier, never later — so tomorrow's targets get re-balanced before the shift starts.
        </p>
      </header>

      {!mounted ? (
        <Card className="p-5 text-sm text-muted-foreground">Checking the window…</Card>
      ) : (
        <>
          <Card className={`p-5 ${w!.open ? "border-warning/50 bg-warning/5" : "border-border"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Clock className={`h-5 w-5 ${w!.open ? "text-warning" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {w!.open ? `Window is open for ${tk}` : `Window is closed for ${tk}`}
                </div>
                <div className="text-sm text-muted-foreground">{w!.reason}</div>
              </div>
              {w!.open && (
                <Badge variant="outline" className="font-mono border-warning/40 text-warning">
                  {hrs}h {mins}m left
                </Badge>
              )}
            </div>
          </Card>

          {mine ? (
            <Card className="p-5 border-primary/40 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2 font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" /> You are off tomorrow · {DAYOFF_LABEL[mine.kind]}
              </div>
              <div className="text-sm text-muted-foreground">Reason: {mine.reason}</div>
              <div className="text-sm text-muted-foreground">Cover owner: {mine.coverOwner}</div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                Filed {new Date(mine.filedAt).toLocaleString()}
              </div>
              <Button size="sm" variant="outline" onClick={() => cancelPlan(mine.id)}>Cancel this plan</Button>
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 font-medium"><CalendarOff className="h-4 w-4 text-primary" /> File tomorrow's off</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Type</label>
                  <Select value={kind} onValueChange={(x) => setKind(x as DayOffKind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DAYOFF_LABEL) as DayOffKind[]).map((k) => (
                        <SelectItem key={k} value={k}>{DAYOFF_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Who covers your targets</label>
                  <Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Name the person, not the team" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Reason</label>
                  <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="One line your manager can plan around" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={!w!.open}
                  onClick={() => {
                    const res = filePlan({ employeeId: actor.id, kind, reason, coverOwner: cover });
                    setMsg({ ok: res.ok, text: res.message });
                    if (res.ok) { setReason(""); setCover(""); }
                  }}
                >
                  File for {tk}
                </Button>
                {!w!.open && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5" /> Outside the window — this would be an unplanned absence.
                  </span>
                )}
              </div>
              {msg && <div className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</div>}
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-2 font-medium mb-3">
              <Users className="h-4 w-4 text-primary" /> Who is off tomorrow ({tk})
            </div>
            {tomorrowTeam.length === 0 ? (
              <div className="text-sm text-muted-foreground">Full floor tomorrow — no planned absences filed.</div>
            ) : (
              <div className="space-y-2">
                {tomorrowTeam.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm">
                    <span className="font-medium">{nameOf(p.employeeId)}</span>
                    <Badge variant="outline">{DAYOFF_LABEL[p.kind]}</Badge>
                    <span className="text-muted-foreground">{p.reason}</span>
                    <span className="ml-auto text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      cover: {p.coverOwner}
                    </span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-2">
                  {tomorrowTeam.length} of {EMPLOYEES.length} people out — re-balance their targets across the remaining floor.
                </div>
              </div>
            )}
          </Card>

          {recent.length > 0 && (
            <Card className="p-5">
              <div className="font-medium mb-3">Recently filed</div>
              <div className="space-y-1.5 text-sm">
                {recent.map((p) => (
                  <div key={p.id} className="flex flex-wrap gap-2 border-t border-border pt-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{p.date}</span>
                    <span>{nameOf(p.employeeId)}</span>
                    <span className="text-muted-foreground">{DAYOFF_LABEL[p.kind]}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}