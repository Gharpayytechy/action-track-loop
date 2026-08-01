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

export interface FlowPhase {
  id: PhaseId;
  name: string;
  window: string;
  due: string;
  dueMins: number;              // minutes from midnight
  checkpoint?: "p1" | "p2" | "eod";
  brief: string;
  steps: FlowStep[];
}

const step = (id: string, label: string, detail?: string, evidence?: string): FlowStep =>
  ({ id, label, detail, evidence });

export function phasesFor(role: CoreRole): FlowPhase[] {
  const t = role.targets;
  const nums = (k: "p1" | "p2" | "eod") => t.map((x) => `${k === "p1" ? x.p1 : k === "p2" ? x.p2 : x.eod} ${x.label.toLowerCase()}`).join(" + ");

  return [
    {
      id: "prep",
      name: "Phase 0 · Lock the day",
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
    },
    {
      id: "p1",
      name: "Phase 1 · First block",
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
    },
    {
      id: "p2",
      name: "Phase 2 · Second block",
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
    },
    {
      id: "p3",
      name: "Phase 3 · Final push",
      window: "5:00 PM – 8:00 PM",
      due: "8:00 PM",
      dueMins: 20 * 60,
      brief: `Close the gap to ${nums("eod")} and leave nothing open behind you.`,
      steps: [
        ...role.p3Work.map((w, i) => step(`p3_w${i}`, w)),
        step("p3_hand", `Hand over everything that continues tomorrow to ${role.handoverTo}`, "A handover without a named owner is not a handover."),
      ],
    },
    {
      id: "eod",
      name: "EOD · Close the day",
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
