// The daily flow, expressed as tickable phases and steps for each core role.
// Every phase tells the person what they are supposed to do next, and nothing
// can be marked complete without ticking the work inside it.

import type { CoreRole } from "@/lib/execution/core-roles";

export type PhaseId = "prep" | "p1" | "p2" | "p3" | "eod";

export interface FlowStep {
  id: string;
  label: string;
  detail?: string;
  evidence?: string;
}

export interface ReportField {
  id: string;
  label: string;
  kind: "number" | "text" | "long";
  placeholder?: string;
  required?: boolean;
}

export interface FlowPhase {
  id: PhaseId;
  name: string;
  codename: string;             // the short name people actually say out loud
  window: string;
  due: string;
  dueMins: number;              // minutes from midnight
  checkpoint?: "p1" | "p2" | "eod";
  brief: string;
  steps: FlowStep[];
  report: ReportField[];        // what must be submitted to close the phase
}

const step = (id: string, label: string, detail?: string, evidence?: string): FlowStep =>
  ({ id, label, detail, evidence });

const f = (id: string, label: string, kind: ReportField["kind"], placeholder?: string, required = true): ReportField =>
  ({ id, label, kind, placeholder, required });

export function phasesFor(role: CoreRole): FlowPhase[] {
  const t = role.targets;
  const nums = (k: "p1" | "p2" | "eod") => t.map((x) => `${k === "p1" ? x.p1 : k === "p2" ? x.p2 : x.eod} ${x.label.toLowerCase()}`).join(" + ");
  const actuals = (k: "p1" | "p2" | "eod") =>
    t.map((x) => f(`m_${k}_${x.id}`, `Actual ${x.label.toLowerCase()} (target ${k === "p1" ? x.p1 : k === "p2" ? x.p2 : x.eod})`, "number", "0"));

  return [
    {
      id: "prep",
      name: "Phase 0 · Lock the day",
      codename: "Lock-In",
      window: "Shift start – 10:45 AM",
      due: "10:45 AM",
      dueMins: 10 * 60 + 45,
      brief: `Before you touch a single lead: lock today's number, know your starting point and read the non-negotiables. Target today is ${nums("eod")}.`,
      steps: [
        step("prep_1", "Clock in and confirm you are available for the full shift", "Any planned absence goes to your manager now, not at 6 PM."),
        step("prep_2", "Open yesterday's carry-forward and pull it into today's list", "Nothing aged should start the day unowned."),
        step("prep_3", `Lock today's committed number: ${nums("eod")}`, "This is the number your EOD is graded against.", "Goal locked in the tracker"),
        step("prep_4", "Take the baseline snapshot (WhatsApp unread + CRM queue)", "Baseline proves what you started with.", "Screenshot"),
        step("prep_5", "Read the non-negotiables for this role out loud once", role.nonNegotiables[0]),
      ],
      report: [
        f("prep_baseline", "Baseline: unread / open items you are starting with", "number", "0"),
        f("prep_carry", "Carry-forward pulled in from yesterday", "text", "e.g. 6 aged leads, 2 pending quotations"),
        f("prep_risk", "The one thing most likely to stop you today", "text", "Name it now, not at 8 PM"),
      ],
    },
    {
      id: "p1",
      name: "Phase 1 · First block",
      codename: "Pace Block",
      window: "10:45 AM – 1:00 PM",
      due: "1:00 PM",
      dueMins: 13 * 60,
      checkpoint: "p1",
      brief: `By 1:00 PM you must be at ${nums("p1")}. This is the pace-setting block — falling behind here costs the whole day.`,
      steps: [
        ...role.p1Work.map((w, i) => step(`p1_w${i}`, w)),
        step("p1_log", "Log every unit as it happens — never in bulk at the end", "Counters below are the source of truth."),
        step("p1_cp", `Post the 1:00 PM checkpoint update with actual vs ${nums("p1")}`, "Actual, target, gap, and the one thing you are fixing next.", "Checkpoint update"),
      ],
      report: [
        ...actuals("p1"),
        f("p1_win", "Biggest win of the block", "text", "One line, with a number"),
        f("p1_block", "What slowed you down", "text", "Blocker + who can unblock it"),
        f("p1_fix", "The one thing you will fix before 5 PM", "long", "Be specific and quantified"),
      ],
    },
    {
      id: "p2",
      name: "Phase 2 · Second block",
      codename: "Acceleration",
      window: "1:00 PM – 5:00 PM",
      due: "5:00 PM",
      dueMins: 17 * 60,
      checkpoint: "p2",
      brief: `By 5:00 PM you must be at ${nums("p2")}. Anything stuck at 1 PM must be resolved or escalated in this block.`,
      steps: [
        ...role.p2Work.map((w, i) => step(`p2_w${i}`, w)),
        step("p2_esc", "Escalate anything blocked for more than 60 minutes", role.escalations[0]),
        step("p2_cp", `Post the 5:00 PM checkpoint update with actual vs ${nums("p2")}`, "If you are under 90% pace, the recovery plan is mandatory.", "Checkpoint update"),
      ],
      report: [
        ...actuals("p2"),
        f("p2_esc_count", "Escalations raised this block", "number", "0"),
        f("p2_stuck", "Anything still stuck after escalation", "text", "Name the item and the owner", false),
        f("p2_plan", "Exact plan to hit EOD from here", "long", "Numbers, not adjectives"),
      ],
    },
    {
      id: "p3",
      name: "Phase 3 · Final push",
      codename: "Final Push",
      window: "5:00 PM – 8:00 PM",
      due: "8:00 PM",
      dueMins: 20 * 60,
      brief: `Close the gap to ${nums("eod")} and leave nothing open behind you.`,
      steps: [
        ...role.p3Work.map((w, i) => step(`p3_w${i}`, w)),
        step("p3_hand", `Hand over everything that continues tomorrow to ${role.handoverTo}`, "A handover without a named owner is not a handover."),
      ],
      report: [
        f("p3_closed", "Gap closed in this block", "text", "e.g. +7 BBD, +2 tours"),
        f("p3_open", "What is still open and who owns it tonight", "text", "Named owner, always"),
        f("p3_hand", `Handover note for ${role.handoverTo}`, "long", "What they must pick up first"),
      ],
    },
    {
      id: "eod",
      name: "EOD · Close the day",
      codename: "Impact",
      window: "8:00 PM",
      due: "8:00 PM",
      dueMins: 20 * 60,
      checkpoint: "eod",
      brief: "EOD cannot close without evidence or an approved recovery plan. Every line below is graded.",
      steps: [
        ...role.eodReport.map((w, i) => step(`eod_r${i}`, w, undefined, "Evidence attached")),
        step("eod_ev", "Attach evidence for every counted unit", "False evidence puts your incentive on hold immediately."),
        step("eod_next", "Declare tomorrow's first priority", "Tomorrow starts from this line."),
      ],
      report: [
        ...actuals("eod"),
        f("eod_evidence", "Evidence reference (screenshot name / CRM filter / sheet link)", "text", "Required — EOD cannot close without it"),
        f("eod_win", "Biggest result delivered today", "text", "With the number"),
        f("eod_miss", "Biggest miss and the honest reason", "text", "No blame, just the cause"),
        f("eod_tomorrow", "Tomorrow's first priority", "long", "The first thing you touch at 10:45 AM"),
      ],
    },
  ];
}

/** Which phase the clock says you should be working right now. */
export function activePhaseId(d = new Date()): PhaseId {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 10 * 60 + 45) return "prep";
  if (m < 13 * 60) return "p1";
  if (m < 17 * 60) return "p2";
  if (m < 20 * 60) return "p3";
  return "eod";
}
