// The Reporting OS, rendered as a WhatsApp thread.
//
// Same data, same checkpoints, same locked CRM fields as the board view in
// ReportingOS.tsx. The difference is the shape: a lead-in bubble per
// checkpoint, one question at a time, and a sent bubble the moment you file.
// Every filed checkpoint stays editable for exactly three minutes, then it is
// on the record.

import { useMemo, useState } from "react";
import {
  CHECKPOINTS, ROLE_FLOWS, checkpointStatus, checkpointById,
  type CheckpointId, type ReportField, type RoleFlow, type RoleFlowKey,
} from "@/data/reporting-os";
import {
  useReportDay, setReportField, submitCheckpoint, unsubmitCheckpoint,
  checkpointFill, reportingFitness, reportText, fieldValue,
  formatMsLeft, type ReportDay,
} from "@/lib/reporting-store";
import { useEditWindow, useMinuteTick, liveCheckpoint } from "@/components/execution/ReportingOS";
import { crmValue, fieldLocked, sourceLabel } from "@/lib/execution/crm-bridge";
import { WhatsAppCopyBlock } from "@/components/execution/WhatsAppCopyBlock";
import {
  Check, CheckCheck, Clock, Lock, Cpu, User, Pencil, Send, Zap, Flame,
  AlertTriangle, ArrowRight, ShieldCheck,
} from "lucide-react";

/* ------------------------------ bubbles ------------------------------ */

function DayChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center my-3">
      <span className="wa-chip px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-center">
        {children}
      </span>
    </div>
  );
}

function In({ children, time }: { children: React.ReactNode; time?: string }) {
  return (
    <div className="flex justify-start">
      <div className="wa-bubble-in wa-pop max-w-[94%] md:max-w-[76%] ml-2 px-3 py-2 text-sm">
        {children}
        {time && <div className="text-[10px] wa-meta text-right mt-1">{time}</div>}
      </div>
    </div>
  );
}

function Out({ children, time, read, edited }: {
  children: React.ReactNode; time?: string; read?: boolean; edited?: boolean;
}) {
  return (
    <div className="flex justify-end">
      <div className="wa-bubble-out wa-pop max-w-[94%] md:max-w-[76%] mr-2 px-3 py-2 text-sm">
        {children}
        {time && (
          <div className="text-[10px] wa-meta text-right mt-1 flex items-center justify-end gap-1">
            {edited && <span className="italic">edited</span>}
            {time}
            <CheckCheck className={`h-3 w-3 ${read ? "text-sky-500" : ""}`} />
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- one field, asked --------------------------- */

function FieldAsk({ field, auto, value, onChange, disabled }: {
  field: ReportField;
  auto: string | null;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const locked = fieldLocked(field, auto);
  const SourceIcon = locked ? Lock : field.source === "human" ? User : Cpu;
  const answered = locked ? (auto ?? "") !== "" : value.trim() !== "";

  return (
    <div className={`rounded-xl px-2.5 py-2 ${answered ? "bg-emerald-500/8" : "bg-black/[0.03] dark:bg-white/[0.04]"}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full grid place-items-center text-[9px]
          ${answered ? "bg-emerald-500 text-white" : "border border-current wa-meta"}`}>
          {answered ? <Check className="h-3 w-3" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{field.label}</span>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest wa-meta">
              <SourceIcon className="h-2.5 w-2.5" /> {sourceLabel(field, locked)}
            </span>
          </div>
          <p className="text-[11px] wa-meta italic mt-0.5">{field.meaning}</p>

          <div className="mt-1.5">
            {locked ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-background/70 border border-border px-2.5 py-1">
                <span className="text-sm font-semibold tabular-nums">{auto || "—"}</span>
                {field.kind === "percent" && <span className="text-xs wa-meta">%</span>}
                <span className="text-[9px] font-mono uppercase tracking-widest wa-meta">pulled, not typed</span>
              </div>
            ) : field.kind === "yesno" ? (
              <div className="flex gap-1.5">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    disabled={disabled}
                    onClick={() => onChange(value === opt ? "" : opt)}
                    className={`h-8 px-4 rounded-full border text-xs font-medium transition-transform active:scale-95 disabled:opacity-50
                      ${value === opt
                        ? opt === "Yes"
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-300"
                        : "border-border bg-background/60 hover:bg-background"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : field.kind === "text" || field.kind === "list" ? (
              <textarea
                rows={field.kind === "list" ? 3 : 2}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.kind === "list" ? "One per line" : "Names, IDs, times. No adjectives."}
                className="w-full rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-60"
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={disabled}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="0"
                  className="w-28 rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-60"
                />
                {field.kind === "percent" && <span className="text-xs wa-meta">%</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- one checkpoint --------------------------- */

function CheckpointThread({ cpId, flow, actorId, day, nowM, openByDefault }: {
  cpId: CheckpointId;
  flow: RoleFlow;
  actorId: string;
  day: ReportDay;
  nowM: number;
  openByDefault: boolean;
}) {
  const cp = checkpointById(cpId);
  const submittedAt = day.submitted[cpId];
  const submitted = Boolean(submittedAt);
  const editLeft = useEditWindow(submittedAt);
  const [open, setOpen] = useState(openByDefault);
  const [reopened, setReopened] = useState(false);

  const status = cpId === "weekly"
    ? (submitted ? "done" : "upcoming")
    : checkpointStatus(cp, nowM, submitted);
  const fill = checkpointFill(day, flow.key, cpId, actorId);
  const fields = flow.checkpoints[cpId];
  const missing = fields.filter(
    (f) => !fieldLocked(f, crmValue(actorId, f, day.date)) && (day.values[f.id] ?? "").trim() === "",
  );

  // Locked once the three minute edit window has burned through.
  const locked = submitted && editLeft <= 0;
  const inputsDisabled = locked;

  const clock = `${String(Math.floor(cp.dueMin / 60) % 12 === 0 ? 12 : Math.floor(cp.dueMin / 60) % 12)}:${String(cp.dueMin % 60).padStart(2, "0")} ${cp.dueMin >= 720 ? "PM" : "AM"}`;

  const statusChip =
    status === "done" ? { text: "filed", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
    : status === "live" ? { text: "due now", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" }
    : status === "late" ? { text: "overdue", cls: "bg-red-500/15 text-red-600 dark:text-red-300" }
    : { text: "upcoming", cls: "bg-black/5 dark:bg-white/10 wa-meta" };

  return (
    <div className="space-y-2" id={`wa-cp-${cpId}`}>
      <DayChip>
        {cp.code} · {cp.clock} · {fill.filled}/{fill.total} fields
        {locked ? " · locked" : submitted ? " · editable" : ""}
      </DayChip>

      <In time={clock}>
        <button onClick={() => setOpen((o) => !o)} className="text-left w-full">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-[10px] font-mono
              ${submitted ? "bg-emerald-500/20 text-emerald-600" : status === "late" ? "bg-red-500/15 text-red-500" : "bg-black/5 dark:bg-white/10 wa-meta"}`}>
              {submitted ? <Check className="h-3.5 w-3.5" /> : cp.code.slice(0, 2)}
            </span>
            <span className="font-semibold">{cp.label}</span>
            {status === "late" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          </div>
          <p className="mt-1 leading-relaxed">{cp.purpose}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`wa-pill ${statusChip.cls}`}>{statusChip.text}</span>
            <span className="wa-pill bg-black/5 dark:bg-white/10 wa-meta">{fill.pct}% filled</span>
            {missing.length > 0 && (
              <span className="wa-pill bg-amber-500/15 text-amber-700 dark:text-amber-300">
                {missing.length} to answer
              </span>
            )}
          </div>
          <span className="mt-1.5 inline-block text-[10px] font-mono uppercase tracking-widest wa-meta">
            {open ? "tap to collapse" : "tap to fill this checkpoint"}
          </span>
        </button>
      </In>

      {open && (
        <>
          <Out>
            <div className="text-[10px] font-mono uppercase tracking-widest wa-meta mb-1.5">
              {submitted && !reopened ? `${cp.code} as filed` : `Answering ${cp.code}`}
            </div>
            <div className="space-y-1.5">
              {fields.map((f) => (
                <FieldAsk
                  key={f.id}
                  field={f}
                  auto={crmValue(actorId, f, day.date)}
                  value={day.values[f.id] ?? ""}
                  onChange={(v) => setReportField(actorId, flow.key, f.id, v)}
                  disabled={inputsDisabled}
                />
              ))}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {!submitted && (
                <button
                  disabled={missing.length > 0}
                  onClick={() => { submitCheckpoint(actorId, flow.key, cpId); setReopened(false); }}
                  className="wa-btn wa-glow h-9 px-4 text-xs inline-flex items-center"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Send {cp.code}
                </button>
              )}

              {submitted && !locked && (
                <>
                  <span className="wa-pill bg-amber-500/15 text-amber-700 dark:text-amber-300 tabular-nums">
                    <Clock className="h-3 w-3 mr-1 inline" /> edit closes in {formatMsLeft(editLeft)}
                  </span>
                  <button
                    onClick={() => { unsubmitCheckpoint(actorId, flow.key, cpId); setReopened(true); }}
                    className="wa-btn-ghost h-8 px-3 text-xs inline-flex items-center"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit this report
                  </button>
                </>
              )}

              {locked && (
                <span className="wa-pill bg-black/5 dark:bg-white/10 wa-meta">
                  <Lock className="h-3 w-3 mr-1 inline" /> locked, three minutes passed
                </span>
              )}

              {!submitted && missing.length > 0 && (
                <span className="text-[11px] wa-meta">
                  {missing.length} judgement field{missing.length === 1 ? "" : "s"} left
                </span>
              )}
            </div>
          </Out>

          {submitted && (
            <Out time={new Date(submittedAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} read edited={reopened}>
              <div className="text-[10px] font-mono uppercase tracking-widest wa-meta mb-1">
                Sent to {flow.handsOffTo.split("→").pop()?.trim() || "your lead"}
              </div>
              <div className="space-y-0.5">
                {fields.slice(0, 5).map((f) => {
                  const v = fieldValue(day, actorId, f.id, flow.key).trim();
                  return (
                    <div key={f.id} className="text-xs">
                      <span className="wa-meta">{f.label}: </span>
                      <span className="font-medium">{v || "not filed"}</span>
                    </div>
                  );
                })}
                {fields.length > 5 && (
                  <div className="text-[11px] wa-meta">+{fields.length - 5} more in the copy block below</div>
                )}
              </div>
            </Out>
          )}

          <div className="px-2">
            <WhatsAppCopyBlock text={reportText(day, flow.key, cpId)} label={`Copy ${cp.code}`} />
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ the thread ------------------------------ */

export function WhatsAppReportingThread({ actorId, roleKey }: {
  actorId: string;
  roleKey: RoleFlowKey;
}) {
  const flow = ROLE_FLOWS[roleKey];
  const day = useReportDay(actorId, roleKey);
  const m = useMinuteTick();
  const live = liveCheckpoint(m);
  const fitness = reportingFitness(day, roleKey);

  const daily = useMemo(() => CHECKPOINTS.filter((c) => c.id !== "weekly"), []);
  const filedCount = CHECKPOINTS.filter((c) => day.submitted[c.id]).length;
  const totalFields = CHECKPOINTS.reduce((n, c) => n + flow.checkpoints[c.id].length, 0);
  const filledFields = CHECKPOINTS.reduce(
    (n, c) => n + checkpointFill(day, roleKey, c.id, actorId).filled, 0,
  );
  const openDefault = live?.id ?? daily.find((c) => !day.submitted[c.id])?.id ?? "wrap";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" });

  const jump = (id: CheckpointId) => {
    document.getElementById(`wa-cp-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
      <div className="wa-hero px-3 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white to-emerald-50 flex items-center justify-center shadow ring-1 ring-white/30 relative shrink-0">
            <span className="text-[#075E54] font-display font-black text-base">{flow.title.slice(0, 1)}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#25D366] ring-2 ring-[#075E54]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold leading-tight truncate">{flow.title} · Reporting OS</p>
            <p className="text-[11px] text-emerald-100/90 leading-tight truncate flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
              {live ? `${live.label} window open until ${live.clock}` : "no window open, prep the next one"}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-mono text-white">
            <Clock className="h-3 w-3" /> live
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-emerald-100/80">
            <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-300" /> reporting fitness</span>
            <span>{fitness.score}% · {fitness.label}</span>
          </div>
          <div className="wa-track h-2 mt-1"><span style={{ width: `${fitness.score}%` }} /></div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
          <HeroStat label="Filed" value={`${filedCount}/${CHECKPOINTS.length}`} />
          <HeroStat label="Fields" value={`${filledFields}/${totalFields}`} />
          <HeroStat label="Edit window" value="3 min" />
        </div>

        <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {CHECKPOINTS.map((c) => {
            const done = Boolean(day.submitted[c.id]);
            const isNow = live?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => jump(c.id)}
                className={`shrink-0 wa-pill border ${
                  done ? "bg-emerald-400/25 border-emerald-200/50 text-emerald-50"
                    : isNow ? "bg-white/90 border-white text-[#075E54]"
                      : "bg-white/10 border-white/25 text-emerald-50/85"
                }`}
              >
                {done ? "✓ " : isNow ? "▶ " : ""}{c.code}
              </button>
            );
          })}
        </div>
      </div>

      <div className="wa-chat-bg px-2 py-4 space-y-3 max-h-[78vh] overflow-y-auto">
        <DayChip>{today}</DayChip>

        <In>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-emerald-500/15 grid place-items-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{flow.subtitle}</p>
              <p className="text-[11px] wa-meta">{flow.mandate}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="wa-meta">{flow.handsOffTo}</span>
          </div>
          <p className="mt-2 text-[11px] wa-meta">
            One rule here: after you send a checkpoint you get three minutes to edit it. After that it is on the record and only a correction with your lead changes it.
          </p>
        </In>

        {CHECKPOINTS.map((c) => (
          <CheckpointThread
            key={c.id}
            cpId={c.id}
            flow={flow}
            actorId={actorId}
            day={day}
            nowM={m}
            openByDefault={c.id === openDefault}
          />
        ))}

        <DayChip>End of today's reporting cadence</DayChip>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 border border-white/15 px-2 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-widest text-emerald-100/80 truncate">{label}</div>
      <div className="font-display text-base font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}
