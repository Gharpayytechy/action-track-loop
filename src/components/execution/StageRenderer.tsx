import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Check, Lock, Upload, MessageSquare, MapPin, Sunrise, Target, Coffee, PhoneCall, ClipboardList, Flag, Trophy, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import type { StageDef, ProofKind } from "@/lib/execution/playbooks";
import { getField, subscribeFields, fieldsVersion } from "@/lib/execution/field-library";
import { FieldRenderer } from "./FieldRenderer";
import { WhatsAppCopyBlock } from "./WhatsAppCopyBlock";
import { renderTemplate } from "@/lib/execution/wa-format";
import { SelfieCapture } from "@/components/SelfieCapture";
import { useSyncExternalStore } from "react";
import { getOverride } from "@/lib/execution/playbooks";
import { fmtDuration } from "@/lib/execution/insights";

interface Props {
  stage: StageDef;
  stageIdx: number;
  totalStages: number;
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  previousValues: Record<string, unknown>;
  startedAt?: number;
  prevSubmitTs?: number;
  submission?: {
    ts?: number;
    values: Record<string, unknown>;
    proofs: Record<string, string | undefined>;
    waMessage?: string;
  };
  onSubmit: (payload: { values: Record<string, unknown>; proofs: Record<string, string | undefined>; waMessage: string }) => void;
}

const PROOF_LABEL: Record<ProofKind, string> = {
  selfie: "Selfie",
  whatsapp: "WhatsApp",
  crm_ss: "CRM shot",
  geo: "Location",
  file: "Attachment",
};

// Strip leading "N · " numbering from playbook labels so the flow feels friendlier
export function prettyStageLabel(label: string): string {
  return label.replace(/^\s*\d+\s*[·.\-]\s*/, "");
}

function stageIcon(stageId: string, label: string) {
  const s = (stageId + " " + label).toLowerCase();
  if (s.includes("login") || s.includes("resume")) return Sunrise;
  if (s.includes("mission")) return Target;
  if (s.includes("break")) return Coffee;
  if (s.includes("call")) return PhoneCall;
  if (s.includes("draft") || s.includes("check")) return ClipboardList;
  if (s.includes("outcome") || s.includes("cycle")) return Flag;
  if (s.includes("impact") || s.includes("eod") || s.includes("logout")) return Trophy;
  return Sparkles;
}

export function StageRenderer(props: Props) {
  const { stage, stageIdx, totalStages, isActive, isDone, isLocked, employeeId, employeeName, employeeRole, previousValues, startedAt, prevSubmitTs, submission, onSubmit } = props;
  useSyncExternalStore(subscribeFields, fieldsVersion, () => 0);
  const override = getOverride(employeeId);
  const [values, setValues] = useState<Record<string, unknown>>(submission?.values || {});
  const [proofs, setProofs] = useState<Record<string, string | undefined>>(submission?.proofs || {});
  const [selfieOpen, setSelfieOpen] = useState(false);

  const fields = useMemo(() => stage.fields.map((id) => getField(id)).filter(Boolean) as ReturnType<typeof getField>[], [stage.fields]);
  const label = prettyStageLabel(stage.label);
  const Icon = stageIcon(stage.id, label);

  const requiredSet = new Set(stage.requiredFields || []);
  const canSubmit = fields.every((f) => !requiredSet.has(f!.id) || (values[f!.id] !== undefined && values[f!.id] !== ""))
    && stage.proofs.every((p) => p === "geo" ? true : !!proofs[p === "whatsapp" ? "whatsapp" : p === "crm_ss" ? "crm_ss" : p === "file" ? "file" : "selfie"]);

  const openStart = isActive ? (prevSubmitTs || startedAt) : undefined;
  const [openedAt] = useState(() => Date.now());
  const elapsedFill = isDone && submission?.ts && prevSubmitTs ? submission.ts - prevSubmitTs : 0;

  const doSubmit = () => {
    if (!canSubmit) { toast.error("Complete required fields and proofs"); return; }
    const mergedForTemplate: Record<string, unknown> = {
      ...previousValues, ...values,
      name: employeeName, role: employeeRole,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    const waMessage = stage.waTemplate ? renderTemplate(stage.waTemplate, mergedForTemplate) : "";
    onSubmit({ values, proofs, waMessage });
    toast.success(`${label} · done`, { description: `Took ${fmtDuration(Date.now() - (openStart || openedAt))}` });
  };

  const pickFile = (kind: ProofKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProofs((p) => ({ ...p, [kind === "crm_ss" ? "crm_ss" : kind === "file" ? "file" : "whatsapp"]: ev.target?.result as string }));
    reader.readAsDataURL(f);
  };

  return (
    <Card className={`relative p-4 md:p-5 transition-all overflow-hidden ${isActive ? "ring-2 ring-primary/60 shadow-lg animate-fade-in" : ""} ${isLocked ? "opacity-55" : ""} ${isDone ? "bg-emerald-500/[0.03] border-emerald-500/30" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 transition-all ${
          isDone ? "bg-emerald-500 text-white shadow-sm"
          : isActive ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15"
          : isLocked ? "bg-muted text-muted-foreground/60"
          : "bg-muted text-muted-foreground"
        }`}>
          {isDone ? <Check className="h-5 w-5" /> : isLocked ? <Lock className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Step {stageIdx + 1} of {totalStages}
            </div>
            {stage.time && <span className="text-[10px] text-muted-foreground font-mono">· {stage.time}</span>}
            {isDone && elapsedFill > 0 && (
              <span className="text-[10px] font-mono text-emerald-600 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDuration(elapsedFill)}</span>
            )}
          </div>
          <h3 className="font-display font-semibold text-lg leading-tight mt-0.5">{label}</h3>
          {stage.proofs.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {stage.proofs.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px] py-0 font-normal">{PROOF_LABEL[p]}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="mt-4 space-y-3">
          {stage.proofs.includes("selfie") && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              {proofs.selfie ? (
                <>
                  <img src={proofs.selfie} className="h-14 w-14 rounded-md object-cover ring-1 ring-border" />
                  <div className="flex-1 text-xs">Selfie captured ✓</div>
                  <Button size="sm" variant="ghost" onClick={() => setSelfieOpen(true)}>Retake</Button>
                </>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-md bg-muted grid place-items-center"><Camera className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="flex-1 text-xs">Quick selfie to confirm you're here</div>
                  <Button size="sm" onClick={() => setSelfieOpen(true)}><Camera className="h-3 w-3 mr-1" /> Capture</Button>
                </>
              )}
            </div>
          )}

          {(["whatsapp","crm_ss","file"] as const).filter((k) => stage.proofs.includes(k as ProofKind)).map((k) => (
            <div key={k} className="p-3 border rounded-lg space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {k === "whatsapp" && <MessageSquare className="h-3.5 w-3.5" />}
                {(k === "crm_ss" || k === "file") && <Upload className="h-3.5 w-3.5" />}
                {PROOF_LABEL[k as ProofKind]}
              </div>
              {proofs[k] ? <img src={proofs[k]!} className="max-h-40 rounded object-contain" /> : null}
              <label className="block">
                <input type="file" accept="image/*" className="hidden" onChange={pickFile(k as ProofKind)} />
                <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-xs cursor-pointer border">
                  <Upload className="h-3 w-3" /> {proofs[k] ? "Replace" : "Upload"}
                </span>
              </label>
            </div>
          ))}

          {stage.proofs.includes("geo") && (
            <div className="flex items-center gap-2 text-xs p-2 border rounded bg-muted/40">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Location auto-captured on submit
            </div>
          )}

          {fields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f) => (
                <FieldRenderer
                  key={f!.id}
                  field={f!}
                  value={values[f!.id]}
                  target={override.targets?.[f!.id] ?? f!.defaultTarget}
                  required={requiredSet.has(f!.id)}
                  onChange={(v) => setValues((prev) => ({ ...prev, [f!.id]: v }))}
                />
              ))}
            </div>
          )}

          <Button className="w-full h-11 text-sm font-medium" disabled={!canSubmit} onClick={doSubmit}>
            {stageIdx + 1 === totalStages ? "🏁 Finish the day" : "Submit & continue →"}
          </Button>
        </div>
      )}

      {isDone && submission && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {submission.proofs.selfie && <img src={submission.proofs.selfie} className="h-12 w-12 rounded-md object-cover ring-1 ring-border" />}
            {submission.proofs.whatsapp && <img src={submission.proofs.whatsapp} className="h-12 w-12 rounded-md object-cover ring-1 ring-border" />}
            {submission.proofs.crm_ss && <img src={submission.proofs.crm_ss} className="h-12 w-12 rounded-md object-cover ring-1 ring-border" />}
          </div>
          {submission.waMessage && <WhatsAppCopyBlock text={submission.waMessage} />}
        </div>
      )}

      <SelfieCapture
        open={selfieOpen}
        title={label}
        onClose={() => setSelfieOpen(false)}
        onCapture={(data) => {
          setProofs((p) => ({ ...p, selfie: data }));
          setSelfieOpen(false);
        }}
      />
    </Card>
  );
}
