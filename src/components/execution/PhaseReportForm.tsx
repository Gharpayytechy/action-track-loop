// Shared end-of-phase submission form. Used by both the guided step-by-step
// runner and the expandable phase cards so the data model stays identical.
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Send } from "lucide-react";
import type { FlowPhase } from "@/lib/execution/core-tasks";
import type { CoreRole } from "@/lib/execution/core-roles";
import { setCount, submitPhase } from "@/lib/execution/core-progress";

export function PhaseReportForm(props: {
  phase: FlowPhase;
  actorId: string;
  roleId: CoreRole["id"];
  existing?: Record<string, string>;
  submittedAt?: number;
  counts: Record<string, number>;
  onSubmitted?: () => void;
}) {
  const { phase, actorId, roleId, existing, submittedAt, counts, onSubmitted } = props;
  const prefill = useMemo(() => {
    const out: Record<string, string> = {};
    for (const fl of phase.report) {
      const m = /^m_(?:p1|p2|eod)_(.+)$/.exec(fl.id);
      if (m) out[fl.id] = String(counts[m[1]] ?? 0);
    }
    return out;
  }, [phase, counts]);
  const [values, setValues] = useState<Record<string, string>>({ ...prefill, ...(existing || {}) });
  const [editing, setEditing] = useState(!submittedAt);
  useEffect(() => { setValues((v) => ({ ...prefill, ...(existing || {}), ...v })); }, [prefill, existing]);

  const missing = phase.report.filter((f) => f.required !== false && !String(values[f.id] ?? "").trim());

  if (submittedAt && !editing) {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <FileText className="h-4 w-4" /> {phase.codename} report submitted
          <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {new Date(submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {phase.report.map((f) => (
          <div key={f.id} className="text-xs">
            <span className="text-muted-foreground">{f.label}: </span>
            <span className="text-foreground">{values[f.id] || "—"}</span>
          </div>
        ))}
        <Button size="sm" variant="outline" className="mt-1" onClick={() => setEditing(true)}>Edit report</Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" /> Submit the {phase.codename} report
      </div>
      <p className="text-xs text-muted-foreground">
        This is the data your manager sees for {phase.due}. Numbers first, then the honest one-liners.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {phase.report.map((f) => (
          <div key={f.id} className={f.kind === "long" ? "sm:col-span-2" : ""}>
            <label className="block text-xs text-muted-foreground mb-1">
              {f.label}{f.required === false && <span className="ml-1 text-[10px] uppercase font-mono">optional</span>}
            </label>
            {f.kind === "long" ? (
              <Textarea
                rows={2}
                value={values[f.id] || ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            ) : (
              <Input
                type={f.kind === "number" ? "number" : "text"}
                value={values[f.id] || ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={missing.length > 0}
          onClick={() => {
            submitPhase(actorId, roleId, phase.id, values);
            for (const [k, val] of Object.entries(values)) {
              const m = /^m_(?:p1|p2|eod)_(.+)$/.exec(k);
              if (m && val !== "" && !Number.isNaN(Number(val))) setCount(actorId, roleId, m[1], Number(val));
            }
            setEditing(false);
            onSubmitted?.();
          }}
        >
          <Send className="h-3.5 w-3.5 mr-1" /> Submit {phase.codename} report
        </Button>
        {missing.length > 0 && (
          <span className="text-xs text-muted-foreground">{missing.length} field{missing.length === 1 ? "" : "s"} still empty</span>
        )}
      </div>
    </div>
  );
}