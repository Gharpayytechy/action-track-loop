// Back-fills 5 recent days of daily-flow submissions for every employee so
// the admin dashboard has real data on first load.

import { EMPLOYEES } from "@/data/seed";
import { seedRecordsIfMissing, type DynDayRecord, type StageSubmission } from "./dyn-store";
import { defaultPlaybookForRole, getPlaybook, type StageDef } from "./playbooks";

const KEY = "gp_dyn_seed_v2";

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function seededRand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
}

function plausibleValue(fieldId: string, rand: () => number, perfMul: number): unknown {
  const p = perfMul;
  const map: Record<string, unknown> = {
    bbd: Math.round((2 + rand() * 2) * p),                // ~2–4
    quotations: Math.round((3 + rand() * 4) * p),         // ~3–7
    cold_calls: Math.round((20 + rand() * 25) * p),
    connected_calls: Math.round((10 + rand() * 12) * p),
    doors_sched: Math.round((3 + rand() * 4) * p),
    doors_initiated: Math.round((2 + rand() * 3) * p),
    checks_drafted: Math.round(28 + rand() * 4),
    calls: Math.round((50 + rand() * 40) * p),
    connected: Math.round((25 + rand() * 20) * p),
    tours_sched: Math.round((6 + rand() * 5) * p),
    tours_done: Math.round((4 + rand() * 4) * p),
    prebook: Math.round((1 + rand() * 3) * p),
    movein: Math.round(rand() * 2 * p),
    super_lead: Math.round(rand() * 2 * p),
    deals: Math.round((1 + rand() * 3) * p),
    revenue: Math.round((20000 + rand() * 60000) * p),
    screens: Math.round((3 + rand() * 4) * p),
    interviews: Math.round((1 + rand() * 3) * p),
    offers: Math.round(rand() * 2 * p),
    joiners: Math.round(rand() * 2 * p),
    candidates_pipeline: Math.round(15 + rand() * 20),
    oneones_done: Math.round((1 + rand() * 3) * p),
    nudges_sent: Math.round((3 + rand() * 5) * p),
    escalations: Math.round(rand() * 3),
    team_goal_pct: Math.round((70 + rand() * 30) * Math.min(1, p)),
    tickets: Math.round((10 + rand() * 10) * p),
    frt_mins: Math.round(3 + rand() * 8),
    csat: Math.round(85 + rand() * 12),
    site_checks: Math.round((2 + rand() * 4) * p),
    sla_flags: Math.round(rand() * 3),
    leads_generated: Math.round((10 + rand() * 15) * p),
    campaigns_shipped: Math.round(rand() * 2 * p),
    spend: Math.round((5000 + rand() * 15000)),
    collections: Math.round((30000 + rand() * 80000)),
    invoices: Math.round((3 + rand() * 5) * p),
    reconciled: Math.round((5 + rand() * 8) * p),
    energy: [3, 4, 5][Math.floor(rand() * 3)],
    expected_finish: "20:00",
    mission_1: "Beat yesterday's BBD number",
    mission_2: "Push 5 quotes before lunch",
    mission_3: "Zero missed callbacks",
    goal: "3 BBD · 5 quotes · 30 checks per cycle",
    biggest_risk: "Low intent walk-ins after 5pm",
    wins: "Closed 2 late-stage prospects; strong afternoon block",
    blockers: "One lead ghosted post-tour; pricing pushback on Andheri unit",
    learning: "Front-load the qualifying questions — fewer wasted tours",
    mistake: "Skipped a follow-up call; won't repeat",
    tomorrow_priority: "Reactivate cold pipeline first thing",
    hard_decision: "Deprioritised a low-intent lead to free time for BBD push",
    cycle_note: "Cycle finished on target, energy holding",
  };
  return map[fieldId] ?? "";
}

function buildDay(empId: string, empName: string, empRole: string, perfMul: number, date: string): DynDayRecord | null {
  const pbId = defaultPlaybookForRole(empRole);
  const pb = getPlaybook(pbId);
  if (!pb) return null;
  const rand = seededRand(empId + "::" + date);
  const stages: StageDef[] = pb.stages;
  const startBase = new Date(date + "T09:15:00").getTime() + Math.floor(rand() * 30 * 60_000);
  const submissions: Record<string, StageSubmission> = {};
  // Complete either all stages (85%) or a partial run (15%) to give admin variance
  const completeAll = rand() > 0.15;
  const runLen = completeAll ? stages.length : Math.max(3, Math.floor(stages.length * (0.4 + rand() * 0.4)));
  let t = startBase;
  for (let i = 0; i < runLen; i++) {
    const stage = stages[i];
    // Per-stage duration: 8–35 min normally, breaks longer
    const isBreak = stage.id.startsWith("break") || stage.id === "pre_break";
    const durMin = isBreak ? 15 + rand() * 10 : 8 + rand() * 22;
    t += Math.round(durMin * 60_000);
    const values: Record<string, unknown> = {};
    for (const fid of stage.fields) values[fid] = plausibleValue(fid, rand, perfMul);
    submissions[stage.id] = {
      stageId: stage.id,
      ts: t,
      values,
      proofs: {}, // seed without image data-URLs to keep localStorage light
      waMessage: "",
    };
  }
  return {
    employeeId: empId,
    date,
    playbookId: pbId,
    stageIdx: runLen,
    submissions,
    startedAt: startBase,
    finishedAt: runLen >= stages.length ? t : undefined,
  };
}

export function ensureDynSeed() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return;
  const today = new Date();
  const days: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    days.push(iso(d));
  }
  const recs: DynDayRecord[] = [];
  for (const emp of EMPLOYEES) {
    const perfMul = Math.max(0.5, Math.min(1.6, emp.performance / 75));
    for (const date of days) {
      const r = buildDay(emp.id, emp.name, emp.role, perfMul, date);
      if (r) recs.push(r);
    }
  }
  seedRecordsIfMissing(recs);
  localStorage.setItem(KEY, "1");
}
