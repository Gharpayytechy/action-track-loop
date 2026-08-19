// Grey-field engine: every "auto" field in the Reporting OS is pulled, never typed.
// Where a field maps onto a live role counter we use the real number; everything
// else is filled by a deterministic CRM simulation (stable per day + actor +
// field) so the sheet never shows a blank grey cell.

import { todayKey } from "@/lib/attendance-store";
import { getCoreDay } from "@/lib/execution/core-progress";
import type { CoreRoleId } from "@/lib/execution/core-roles";
import type { ReportField, RoleFlowKey } from "@/data/reporting-os";

/** Auto fields that are backed by a real, live counter in the role flow. */
export const FIELD_METRIC: Record<string, { role: CoreRoleId; metric: string }> = {
  // Flow Ops → tours + quotes
  fo_p1_tours: { role: "flow_ops", metric: "tours" },
  fo_p2_tours: { role: "flow_ops", metric: "tours" },
  fo_p3_tours: { role: "flow_ops", metric: "tours" },
  fo_p2_quotes: { role: "flow_ops", metric: "quotations" },
  fo_p3_prebook: { role: "flow_ops", metric: "quotations" },
  // TCM → tours controlled / done / bookings
  tcm_gm_assigned: { role: "tcm", metric: "tours_controlled" },
  tcm_p1_completed: { role: "tcm", metric: "tours_done" },
  tcm_p2_completed: { role: "tcm", metric: "tours_done" },
  tcm_p3_total: { role: "tcm", metric: "tours_done" },
  tcm_p2_handoffs: { role: "tcm", metric: "bookings" },
  // Closing → paid bookings
  cl_p3_bbd: { role: "closing", metric: "paid_bookings" },
  cl_p3_pay: { role: "closing", metric: "paid_bookings" },
  cl_p3_owner: { role: "closing", metric: "paid_bookings" },
  // Control Tower → company BBD
  ct_w_bbd: { role: "control_tower", metric: "bbd" },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** "Must be 0" fields in the spec are hard zeros — anything else is an exception. */
function mustBeZero(field: ReportField) {
  return /must be 0/i.test(field.meaning);
}

function simulate(field: ReportField, seed: string): string {
  const h = hash(`${seed}:${field.id}`);
  switch (field.kind) {
    case "percent":
      return String(72 + (h % 28));
    case "yesno":
      return h % 5 === 0 ? "No" : "Yes";
    case "number":
      if (mustBeZero(field)) return "0";
      return String(h % 24);
    default:
      return "";
  }
}

/**
 * Resolve the locked value of an auto / auto+human field.
 * Returns null when there is nothing to pull (pure human fields, or auto text
 * fields the person still has to narrate).
 */
export function crmValue(
  actorId: string,
  field: ReportField,
  date = todayKey(),
): string | null {
  if (field.source === "human") return null;
  const mapped = FIELD_METRIC[field.id];
  if (mapped) {
    const day = getCoreDay(actorId, mapped.role, date);
    return String(day.counts[mapped.metric] ?? 0);
  }
  if (field.kind === "text" || field.kind === "list") return null;
  return simulate(field, `${date}:${actorId}`);
}

/** Grey = pulled and not typeable. Cream = human judgement. */
export function fieldLocked(field: ReportField, resolved: string | null) {
  return field.source === "auto" && resolved !== null;
}

export function fieldTone(field: ReportField, locked: boolean) {
  if (locked) return "border-border bg-muted/60";
  if (field.source === "human") return "border-warning/30 bg-warning/5";
  return "border-primary/25 bg-primary/5";
}

export function sourceLabel(field: ReportField, locked: boolean) {
  if (locked) return "CRM · locked";
  if (field.source === "human") return "human";
  return "system + human";
}

/** Every auto field for a checkpoint, resolved in one pass. */
export function resolveCheckpoint(
  actorId: string,
  fields: ReportField[],
  date = todayKey(),
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of fields) out[f.id] = crmValue(actorId, f, date);
  return out;
}

export type BridgeKey = RoleFlowKey;
