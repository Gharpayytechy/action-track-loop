// Reporting OS panel — the checkpoint filing surface used by /reporting, every
// role flow page and the daily flow. Grey fields are pulled from CRM and cannot
// be typed; cream fields are pure human judgement.
import { useEffect, useMemo, useState } from "react";
import {
  Clock, Copy, Check, Undo2, AlertTriangle, ArrowRight, Cpu, User,
  GitCompareArrows, Moon, Sunrise, Lock, ShieldCheck, Coffee,
} from "lucide-react";
import {
  CHECKPOINTS, ROLE_FLOWS, checkpointStatus, activeBreak, breakAfter, RHYTHM_RULE,
  type CheckpointId, type ReportField, type RoleFlow, type RoleFlowKey,
} from "@/data/reporting-os";
import {
  useReportDay, useReportsToday, setReportField, submitCheckpoint, unsubmitCheckpoint,
  checkpointFill, reportingFitness, reportText, bridgeStatuses, confirmBridge,
  EDIT_WINDOW_MS, formatMsLeft, type ReportDay,
} from "@/lib/reporting-store";
import { crmValue, fieldLocked, fieldTone, sourceLabel } from "@/lib/execution/crm-bridge";

export function nowMin(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

/** Live window (or null outside every window). */
export function liveCheckpoint(m: number) {
  return CHECKPOINTS.filter((c) => c.id !== "weekly").find((c) => m >= c.atMin && m <= c.dueMin) ?? null;
}

export function useMinuteTick() {
  // Start from a deterministic value so SSR and the first client render agree,
  // then switch to the real clock after hydration.
  const [m, setM] = useState(-1);
  useEffect(() => {
    setM(nowMin());
    const i = setInterval(() => setM(nowMin()), 60_000);
    return () => clearInterval(i);
  }, []);
  return m;
}

export function ReportingOSPanel({
  actorId, roleKey, only, showFunnel = true,
}: {
  actorId: string;
  roleKey: RoleFlowKey;
  only?: CheckpointId[];
  showFunnel?: boolean;
}) {
  const flow = ROLE_FLOWS[roleKey];
  const day = useReportDay(actorId, roleKey);
  const m = useMinuteTick();
  const cps = useMemo(
    () => (only ? CHECKPOINTS.filter((c) => only.includes(c.id)) : CHECKPOINTS),
    [only],
  );

  return (
    <div className="space-y-4">
      {cps.map((cp) => (
        <CheckpointCard key={cp.id} cpId={cp.id} flow={flow} actorId={actorId} nowM={m} day={day} />
      ))}
      {showFunnel && <FunnelBoard actorId={actorId} roleKey={roleKey} />}
    </div>
  );
}

export function ReportingHeaderStat({ actorId, roleKey }: { actorId: string; roleKey: RoleFlowKey }) {
  const day = useReportDay(actorId, roleKey);
  const fitness = reportingFitness(day, roleKey);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-center min-w-[104px]">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">Reporting fitness</div>
      <div className="text-2xl font-bold tabular-nums">
        {fitness.score}<span className="text-sm text-muted-foreground">%</span>
      </div>
      <div className={`text-[10px] uppercase tracking-widest font-mono ${
        fitness.score >= 70 ? "text-success" : fitness.score >= 40 ? "text-warning" : "text-destructive"
      }`}>{fitness.label}</div>
    </div>
  );
}

export function NowLine() {
  const m = useMinuteTick();
  const live = liveCheckpoint(m);
  const brk = activeBreak(m);
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-4 py-2.5 flex items-center gap-2 text-sm">
      {live ? (
        <>
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-primary">Live window</span>
          <span className="font-semibold">{live.label}</span>
          <span className="ml-auto text-xs text-muted-foreground">{live.clock}</span>
        </>
      ) : brk ? (
        <>
          <Coffee className="h-4 w-4 text-warning" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-warning">{brk.label}</span>
          <span className="text-muted-foreground">{brk.thenWhat}</span>
          <span className="ml-auto text-xs text-muted-foreground shrink-0">{brk.clock}</span>
        </>
      ) : (
        <>
          {m < t1035 ? <Sunrise className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-muted-foreground">
            {m < t1035
              ? "Day has not started. The 10:35 goal declaration opens the rhythm."
              : "No checkpoint window open right now — prep the next one below."}
          </span>
        </>
      )}
    </div>
  );
}

const t1035 = 10 * 60 + 35;

/** The whole operating rhythm on one strip: checkpoints and breaks in order. */
export function RhythmStrip() {
  const m = useMinuteTick();
  const live = liveCheckpoint(m);
  const brk = activeBreak(m);
  const items = useMemo(() => {
    const out: { key: string; clock: string; label: string; note: string; isBreak: boolean }[] = [];
    CHECKPOINTS.filter((c) => c.id !== "weekly").forEach((c) => {
      out.push({
        key: c.id, clock: c.clock, label: c.label, note: c.purpose,
        isBreak: false,
      });
      const b = breakAfter(c.id);
      if (b) out.push({ key: b.id, clock: b.clock, label: b.label, note: b.thenWhat, isBreak: true });
    });
    return out;
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">The daily operating rhythm</h2>
      </div>
      <ol className="space-y-1.5">
        {items.map((it) => {
          const active = it.isBreak ? brk?.id === it.key : live?.id === it.key;
          return (
            <li
              key={it.key}
              className={`flex gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-primary/50 bg-primary/10"
                  : it.isBreak
                    ? "border-dashed border-border bg-muted/30"
                    : "border-border bg-background"
              }`}
            >
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground w-[92px] shrink-0 pt-0.5">
                {it.clock}
              </span>
              <span className="min-w-0">
                <span className="font-medium flex items-center gap-1.5">
                  {it.isBreak && <Coffee className="h-3.5 w-3.5 text-warning shrink-0" />}
                  {it.label}
                </span>
                <span className="block text-xs text-muted-foreground">{it.note}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          One rule above everything
        </div>
        <p className="text-xs text-muted-foreground">
          {RHYTHM_RULE.join(" ")} The system never rewards someone merely for being busy — it
          asks what you promised, what happened, what the gap is, what you will do next, and what
          business outcome you created.
        </p>
      </div>
    </div>
  );
}

/**
 * Live countdown on the three minute edit window that opens the moment a
 * checkpoint is filed. Ticks every second, and only while a window is open.
 */
export function useEditWindow(submittedAt?: number): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!submittedAt) { setLeft(0); return; }
    const calc = () => Math.max(0, submittedAt + EDIT_WINDOW_MS - Date.now());
    setLeft(calc());
    const i = setInterval(() => {
      const next = calc();
      setLeft(next);
      if (next <= 0) clearInterval(i);
    }, 1000);
    return () => clearInterval(i);
  }, [submittedAt]);
  return left;
}

function CheckpointCard({ cpId, flow, actorId, nowM, day }: {
  cpId: CheckpointId;
  flow: RoleFlow;
  actorId: string;
  nowM: number;
  day: ReportDay;
}) {
  const cp = CHECKPOINTS.find((c) => c.id === cpId)!;
  const submitted = Boolean(day.submitted[cpId]);
  const status = cpId === "weekly"
    ? (submitted ? "done" : "upcoming")
    : checkpointStatus(cp, nowM, submitted);
  const fill = checkpointFill(day, flow.key, cpId, actorId);
  const [open, setOpen] = useState(status === "live" || status === "late");
  const [copied, setCopied] = useState(false);
  const editLeft = useEditWindow(day.submitted[cpId]);

  const tone =
    status === "done" ? "border-success/40 bg-success/5"
    : status === "live" ? "border-primary/40 bg-primary/5"
    : status === "late" ? "border-destructive/40 bg-destructive/5"
    : "border-border bg-card";

  const badge =
    status === "done" ? { text: "Submitted", cls: "text-success" }
    : status === "live" ? { text: "Due now", cls: "text-primary" }
    : status === "late" ? { text: "Overdue", cls: "text-destructive" }
    : { text: "Upcoming", cls: "text-muted-foreground" };

  const missingHuman = flow.checkpoints[cpId].filter(
    (f) => !fieldLocked(f, crmValue(actorId, f, day.date)) && (day.values[f.id] ?? "").trim() === "",
  );

  const copy = async () => {
    await navigator.clipboard.writeText(reportText(day, flow.key, cpId));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className={`rounded-xl border ${tone} transition-colors`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-4 md:p-5 flex flex-wrap items-center gap-3"
      >
        <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
          {cp.code}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{cp.label}</span>
            <span className="text-xs font-mono text-muted-foreground">{cp.clock}</span>
            {status === "late" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{cp.purpose}</p>
        </div>
        <div className="text-right">
          <div className={`text-[10px] uppercase tracking-widest font-mono ${badge.cls}`}>{badge.text}</div>
          <div className="text-xs text-muted-foreground tabular-nums">{fill.filled}/{fill.total} fields</div>
        </div>
      </button>

      <div className="h-1 bg-secondary/60 mx-4 md:mx-5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${status === "late" ? "bg-destructive" : status === "done" ? "bg-success" : "bg-primary"}`}
          style={{ width: `${Math.max(2, fill.pct)}%` }}
        />
      </div>

      {open && (
        <div className="p-4 md:p-5 pt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> grey = CRM, cannot be typed</span>
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> cream = your judgement</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {flow.checkpoints[cpId].map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                auto={crmValue(actorId, f, day.date)}
                value={day.values[f.id] ?? ""}
                onChange={(v) => setReportField(actorId, flow.key, f.id, v)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {submitted ? (
              editLeft > 0 ? (
                <button
                  onClick={() => unsubmitCheckpoint(actorId, flow.key, cpId)}
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 text-xs hover:bg-warning/20"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Edit · {formatMsLeft(editLeft)} left
                </button>
              ) : (
                <span className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Locked on the record
                </span>
              )
            ) : (
              <button
                disabled={missingHuman.length > 0}
                onClick={() => submitCheckpoint(actorId, flow.key, cpId)}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Submit {cp.code}
              </button>
            )}
            <button
              onClick={copy}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card text-xs hover:bg-secondary"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy report"}
            </button>
            {!submitted && missingHuman.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {missingHuman.length} judgement field{missingHuman.length === 1 ? "" : "s"} still empty
              </span>
            )}
            {submitted && (
              <span className="text-[11px] font-mono text-muted-foreground ml-auto">
                submitted {new Date(day.submitted[cpId]!).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function FieldRow({ field, auto, value, onChange }: {
  field: ReportField; auto: string | null; value: string; onChange: (v: string) => void;
}) {
  const locked = fieldLocked(field, auto);
  const shown = locked ? (auto ?? "") : value;
  const SourceIcon = locked ? Lock : field.source === "human" ? User : Cpu;

  return (
    <div className={`rounded-lg border p-3 ${fieldTone(field, locked)}`}>
      <div className="flex items-start justify-between gap-2">
        <label className="text-sm font-medium">{field.label}</label>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">
          <SourceIcon className="h-3 w-3" /> {sourceLabel(field, locked)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground italic mt-0.5">{field.meaning}</p>
      <div className="mt-2">
        {locked ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
            <span className="text-sm font-semibold tabular-nums">{shown || "—"}</span>
            {field.kind === "percent" && <span className="text-sm text-muted-foreground">%</span>}
            <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground">pulled</span>
          </div>
        ) : field.kind === "yesno" ? (
          <div className="flex gap-2">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(value === opt ? "" : opt)}
                className={`h-8 flex-1 rounded-md border text-xs font-medium ${
                  value === opt
                    ? opt === "Yes"
                      ? "border-success/40 bg-success/15 text-success"
                      : "border-destructive/40 bg-destructive/15 text-destructive"
                    : "border-border bg-secondary hover:bg-secondary/70"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : field.kind === "text" || field.kind === "list" ? (
          <textarea
            rows={field.kind === "list" ? 3 : 2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.kind === "list" ? "One per line" : "Be specific — names, IDs, times"}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {field.kind === "percent" && <span className="text-sm text-muted-foreground">%</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Connected funnel: every number carries an unconfirmed flag until the next role signs it. */
export function FunnelBoard({ actorId, roleKey }: { actorId?: string; roleKey?: RoleFlowKey }) {
  const days = useReportsToday();
  const bridges = bridgeStatuses(days);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <GitCompareArrows className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Connected funnel — reconciliation bridges</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Numbers stand as filed but stay flagged <span className="font-mono text-warning">unconfirmed</span> until
        the next role in the funnel signs them. Mismatch = action, not discussion.
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        {bridges.map((b) => {
          const canConfirm = roleKey === b.to && actorId;
          const tone =
            b.state === "mismatch" ? "border-destructive/40 bg-destructive/5"
            : b.confirmed ? "border-success/40 bg-success/5"
            : "border-warning/30 bg-warning/5";
          return (
            <div key={b.id} className={`rounded-lg border p-3 text-sm ${tone}`}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {ROLE_FLOWS[b.from].title} → {ROLE_FLOWS[b.to].title}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span>{b.fromLabel} <span className="font-semibold tabular-nums">{b.sent ?? "—"}</span></span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{b.toLabel} <span className="font-semibold tabular-nums text-foreground">{b.received ?? "—"}</span></span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest ${
                  b.state === "mismatch" ? "text-destructive" : b.confirmed ? "text-success" : "text-warning"
                }`}>
                  {b.state === "mismatch" ? "mismatch" : b.confirmed ? "confirmed" : "unconfirmed"}
                </span>
                {canConfirm && !b.confirmed && (
                  <button
                    onClick={() => confirmBridge(actorId!, b.to, b.id)}
                    className="ml-auto h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90"
                  >
                    <ShieldCheck className="h-3 w-3" /> Confirm received
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
