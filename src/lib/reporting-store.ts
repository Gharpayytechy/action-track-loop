// Reporting OS store — per-actor, per-day checkpoint reports
// (GM → 1 PM → 4 PM → 5 PM → 8 PM wrap → Weekly).
import { useSyncExternalStore } from "react";
import { makeStore } from "./store";
import {
  CHECKPOINTS, ROLE_FLOWS, ROLE_FLOW_ORDER, checkpointById,
  type CheckpointId, type RoleFlowKey,
} from "@/data/reporting-os";
import { crmValue } from "@/lib/execution/crm-bridge";

export interface ReportDay {
  date: string;      // YYYY-MM-DD
  actorId: string;
  roleKey: RoleFlowKey;
  values: Record<string, string>;                    // fieldId → value (human fields)
  submitted: Partial<Record<CheckpointId, number>>;  // checkpoint → submitted ts
  confirmed: Record<string, number>;                 // bridge id → confirmed ts (downstream role)
}

export interface ReportingState {
  days: ReportDay[];
}

const store = makeStore<ReportingState>("gp_reporting_os_v2", { days: [] });

export function ensureReportingSeed() {
  store.ensureSeed();
}

export function reportDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function blank(date: string, actorId: string, roleKey: RoleFlowKey): ReportDay {
  return { date, actorId, roleKey, values: {}, submitted: {}, confirmed: {} };
}

function norm(d: ReportDay): ReportDay {
  return { ...blank(d.date, d.actorId, d.roleKey), ...d };
}

function find(state: ReportingState, date: string, actorId: string, roleKey: RoleFlowKey) {
  const hit = state.days.find((d) => d.date === date && d.actorId === actorId && d.roleKey === roleKey);
  return hit ? norm(hit) : undefined;
}

function patch(actorId: string, roleKey: RoleFlowKey, fn: (d: ReportDay) => ReportDay) {
  const date = reportDateKey();
  const state = store.read();
  const day = find(state, date, actorId, roleKey) ?? blank(date, actorId, roleKey);
  const others = state.days.filter(
    (d) => !(d.date === date && d.actorId === actorId && d.roleKey === roleKey),
  );
  store.write({ days: [fn(day), ...others] });
}

function useReportingState() {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.read(),
    store.getServerSnapshot,
  );
}

export function useReportDay(actorId: string, roleKey: RoleFlowKey): ReportDay {
  const state = useReportingState();
  const date = reportDateKey();
  return find(state, date, actorId, roleKey) ?? blank(date, actorId, roleKey);
}

/** Every report filed today, across roles — powers the admin compliance board. */
export function useReportsToday(): ReportDay[] {
  const state = useReportingState();
  const date = reportDateKey();
  return state.days.filter((d) => d.date === date).map(norm);
}

export function setReportField(actorId: string, roleKey: RoleFlowKey, fieldId: string, value: string) {
  patch(actorId, roleKey, (d) => ({ ...d, values: { ...d.values, [fieldId]: value } }));
}

export function submitCheckpoint(actorId: string, roleKey: RoleFlowKey, cp: CheckpointId) {
  patch(actorId, roleKey, (d) => ({ ...d, submitted: { ...d.submitted, [cp]: Date.now() } }));
}

export function unsubmitCheckpoint(actorId: string, roleKey: RoleFlowKey, cp: CheckpointId) {
  patch(actorId, roleKey, (d) => {
    const next = { ...d.submitted };
    delete next[cp];
    return { ...d, submitted: next };
  });
}

/**
 * WhatsApp-style edit window. A filed checkpoint stays editable for exactly
 * three minutes after it was sent. After that it is on the record and the only
 * way to change it is to file a correction with your lead.
 */
export const EDIT_WINDOW_MS = 3 * 60 * 1000;

export function editMsLeft(day: ReportDay, cp: CheckpointId, now = Date.now()): number {
  const ts = day.submitted[cp];
  if (!ts) return 0;
  return Math.max(0, ts + EDIT_WINDOW_MS - now);
}

export function isEditable(day: ReportDay, cp: CheckpointId, now = Date.now()): boolean {
  return editMsLeft(day, cp, now) > 0;
}

export function formatMsLeft(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function confirmBridge(actorId: string, roleKey: RoleFlowKey, bridgeId: string) {
  patch(actorId, roleKey, (d) => ({ ...d, confirmed: { ...d.confirmed, [bridgeId]: Date.now() } }));
}

// ---- Values: human typed value, or the locked CRM pull ----
export function fieldValue(day: ReportDay, actorId: string, fieldId: string, roleKey: RoleFlowKey): string {
  const field = ROLE_FLOWS[roleKey].checkpoints;
  for (const cp of Object.keys(field) as CheckpointId[]) {
    const f = field[cp].find((x) => x.id === fieldId);
    if (!f) continue;
    const auto = crmValue(actorId, f, day.date);
    if (f.source === "auto" && auto !== null) return auto;
    return day.values[fieldId] ?? auto ?? "";
  }
  return day.values[fieldId] ?? "";
}

// ---- Derived ----
export function checkpointFill(day: ReportDay, roleKey: RoleFlowKey, cp: CheckpointId, actorId = day.actorId) {
  const fields = ROLE_FLOWS[roleKey].checkpoints[cp];
  const filled = fields.filter((f) => {
    const auto = crmValue(actorId, f, day.date);
    if (f.source === "auto" && auto !== null) return true;
    return (day.values[f.id] ?? "").trim() !== "";
  }).length;
  return { filled, total: fields.length, pct: Math.round((filled / fields.length) * 100) };
}

export function reportingFitness(day: ReportDay, roleKey: RoleFlowKey): { score: number; label: string } {
  const daily = CHECKPOINTS.filter((c) => c.id !== "weekly");
  let sum = 0;
  daily.forEach((c) => {
    const f = checkpointFill(day, roleKey, c.id);
    const submitted = day.submitted[c.id] ? 1 : 0.6;
    sum += (f.pct / 100) * submitted;
  });
  const score = Math.round((sum / daily.length) * 100);
  const label = score >= 90 ? "Elite" : score >= 70 ? "Fit" : score >= 40 ? "Slipping" : "Unfit";
  return { score, label };
}

export function reportText(day: ReportDay, roleKey: RoleFlowKey, cp: CheckpointId): string {
  const flow = ROLE_FLOWS[roleKey];
  const c = checkpointById(cp);
  const lines = [`${flow.title.toUpperCase()} — ${c.label} (${c.clock}) — ${day.date}`, ""];
  flow.checkpoints[cp].forEach((f) => {
    const v = fieldValue(day, day.actorId, f.id, roleKey).trim();
    lines.push(`${f.label}: ${v || "—"}`);
  });
  lines.push("", `Handoff: ${flow.handsOffTo}`);
  return lines.join("\n");
}

// ---- Connected funnel: no number counts until the next role confirms it ----
export interface BridgeSpec {
  id: string;
  from: RoleFlowKey;
  fromField: string;
  fromLabel: string;
  to: RoleFlowKey;
  toField: string;
  toLabel: string;
}

export const BRIDGE_SPECS: BridgeSpec[] = [
  { id: "ct_fo", from: "control_tower", fromField: "ct_gm_stock", fromLabel: "Leads requiring ownership", to: "flow_ops", toField: "fo_gm_assigned", toLabel: "Leads received" },
  { id: "fo_tcm", from: "flow_ops", fromField: "fo_p3_tours", fromLabel: "Tours scheduled", to: "tcm", toField: "tcm_gm_assigned", toLabel: "Tours received" },
  { id: "tcm_cl", from: "tcm", fromField: "tcm_p2_handoffs", fromLabel: "Closing handoffs", to: "closing", toField: "cl_gm_received", toLabel: "Opportunities received" },
  { id: "cl_co", from: "closing", fromField: "cl_p3_bbd", fromLabel: "Verified bookings", to: "control_tower", toField: "ct_w_bbd", toLabel: "Company BBD" },
];

export type BridgeState = "matched" | "mismatch" | "awaiting";

export interface BridgeStatus extends BridgeSpec {
  sent: number | null;
  received: number | null;
  state: BridgeState;
  confirmed: boolean;
}

function sumField(days: ReportDay[], roleKey: RoleFlowKey, fieldId: string): number | null {
  const rows = days.filter((d) => d.roleKey === roleKey);
  if (rows.length === 0) return null;
  let any = false;
  let total = 0;
  for (const d of rows) {
    const raw = fieldValue(d, d.actorId, fieldId, roleKey).trim();
    if (raw === "") continue;
    const n = Number(raw);
    if (Number.isNaN(n)) continue;
    any = true;
    total += n;
  }
  return any ? total : null;
}

export function bridgeStatuses(days: ReportDay[]): BridgeStatus[] {
  return BRIDGE_SPECS.map((b) => {
    const sent = sumField(days, b.from, b.fromField);
    const received = sumField(days, b.to, b.toField);
    const confirmed = days.some((d) => d.roleKey === b.to && d.confirmed[b.id]);
    const state: BridgeState =
      sent === null || received === null ? "awaiting" : sent === received ? "matched" : "mismatch";
    return { ...b, sent, received, state, confirmed };
  });
}

/** Soft flag: the number stands, but it is unconfirmed until the next role signs it. */
export function unconfirmedCount(days: ReportDay[]): number {
  return bridgeStatuses(days).filter((b) => !b.confirmed || b.state === "mismatch").length;
}

export function roleFlowOrder() {
  return ROLE_FLOW_ORDER;
}
