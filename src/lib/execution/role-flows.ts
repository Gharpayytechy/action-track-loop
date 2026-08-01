// Role-specific daily flows for every role in the Gharpayy Role + KRA System (v1.0).
// Each role runs the same control-point rhythm defined in the operating model:
//   Morning Goal (10:15–10:45) → Phase 1 (shift start–1:00 PM) →
//   1:00 PM update + break → Phase 2 (1:00–5:00 PM) → 5:00 PM update →
//   Phase 3 (5:00 PM–EOD) → EOD submission (by 8:00 PM)
// The work described in each phase and the metrics captured are role-specific.

import type { Playbook, StageDef } from "@/lib/execution/playbooks";

export interface RoleFlow {
  roleId: string;          // stable ID from the KRA system, e.g. DEM-FLOW
  playbookId: string;      // pb_role_<slug>
  roleName: string;
  department: string;
  result: string;          // final result owned, one line
  p1: string;              // Phase 1 work
  p2: string;              // Phase 2 work
  p3: string;              // Phase 3 work
  metrics: string[];       // field ids captured each phase
  match: string[];         // lowercase keywords used to resolve a role name
}

export const ROLE_FLOWS: RoleFlow[] = [
  {
    roleId: "DEM-INTAKE", playbookId: "pb_role_dem_intake", roleName: "Lead Intake & CRM Executive", department: "Demand Operations",
    result: "Every source enquiry becomes one clean, deduplicated, correctly zoned CRM lead.",
    p1: "Reconcile every active source, create or merge leads, and clear the unprocessed intake queue.",
    p2: "Correct source, zone, urgency and minimum fields, then route assignment-ready records to the Control Tower.",
    p3: "Close source vs CRM variance, document exceptions and prepare tomorrow's channel coverage.",
    metrics: ["enquiries_captured", "leads_deduped", "wrong_zone_fixed"],
    match: ["lead intake", "intake", "crm executive"],
  },
  {
    roleId: "DEM-CONTROL", playbookId: "pb_role_dem_control", roleName: "Lead Control Tower Executive", department: "Demand Operations",
    result: "Zero unassigned active leads and every priority lead acted on within SLA.",
    p1: "Count today, 7-day and 30-day leads, then allocate work by intent, capability and current load.",
    p2: "Monitor first action, connected work, tours and stuck queues, and rebalance before capacity is wasted.",
    p3: "Clear every unassigned or overdue exception and lock next-day carry-forward.",
    metrics: ["leads_assigned", "sla_interventions", "revival_pool"],
    match: ["control tower", "lead control"],
  },
  {
    roleId: "DEM-FLOW", playbookId: "pb_role_dem_flow", roleName: "Flow Ops Executive", department: "Demand Operations",
    result: "Qualified, committed, exact-property tours from every assigned lead.",
    p1: "Work priority leads first, qualify location, budget, date and inventory, and build the immediate and future pipelines.",
    p2: "Recommend the best two options, build the dossier, validate exact inventory and secure a committed tour time.",
    p3: "Recover pending conversations, complete handovers and leave no lead without an outcome.",
    metrics: ["connected_calls", "qualified_tours", "leads_progressed"],
    match: ["flow ops", "flowops"],
  },
  {
    roleId: "DEM-REVIVE", playbookId: "pb_role_dem_revive", roleName: "Lead Revival & Stuck Queue Specialist", department: "Demand Operations",
    result: "Inactive leads return to an active buying path with a valid next action.",
    p1: "Segment the queue by age, prior objection, property and move-in date, and prioritise inventory-matched leads.",
    p2: "Run personalised call and WhatsApp sequences, and route active intent to the right current owner.",
    p3: "Complete the queue, record terminal reasons and surface repeated objections.",
    metrics: ["revival_attempts", "revival_connects", "reactivated_leads"],
    match: ["revival", "stuck queue"],
  },
  {
    roleId: "VIS-TCM", playbookId: "pb_role_vis_tcm", roleName: "Tour Conversion Manager", department: "Visit & Conversion",
    result: "Every scheduled tour has a true live status and every completed tour enters a buying path.",
    p1: "Confirm today's tours, exact inventory, manager access, travel plan and backup property.",
    p2: "Control live movement, solve delays and make sure each visit sees the approved purchasable option.",
    p3: "Capture feedback, issue the buying path, recover no-shows and hand over to closure.",
    metrics: ["tours_confirmed", "tours_completed", "post_tour_reports"],
    match: ["tour conversion", "tcm"],
  },
  {
    roleId: "VIS-WARROOM", playbookId: "pb_role_vis_warroom", roleName: "Visit War Room Controller", department: "Visit & Conversion",
    result: "Every tour today stays visible, truthfully updated and intervention-ready until final outcome.",
    p1: "Audit today's calendar, confirmation status, assigned owners, supply and high-risk visits.",
    p2: "Track en route, arrival and completion, and trigger the right owner before the experience breaks.",
    p3: "Close every tour record, route hot cases and produce root-cause exceptions for tomorrow.",
    metrics: ["tours_tracked", "delay_interventions", "noshow_recovered"],
    match: ["war room", "warroom"],
  },
  {
    roleId: "VIS-FIELD", playbookId: "pb_role_vis_field", roleName: "Field Visit Executive", department: "Visit & Conversion",
    result: "Valid visits completed on the approved room or bed with immediate handover.",
    p1: "Review itinerary, route, property facts, rooms to show, commercials and contact people.",
    p2: "Meet on time, present only relevant inventory, disclose the sample room honestly and capture objections.",
    p3: "Complete evidence, hand over hot intent immediately and report property-side failures.",
    metrics: ["visits_completed", "ontime_arrivals", "handovers_done"],
    match: ["field visit", "field executive"],
  },
  {
    roleId: "VIS-CLOSE", playbookId: "pb_role_vis_close", roleName: "Closure & Negotiation Specialist", department: "Visit & Conversion",
    result: "Paid, exact-bed, owner-honoured bookings from eligible high-intent opportunities.",
    p1: "Rank hot, tour-done, ready-to-pay and decision-due customers, and identify the single true objection.",
    p2: "Secure approved terms, present one final offer, place the exact-bed hold and collect payment.",
    p3: "Recover pending decisions, release expired holds and hand over paid bookings.",
    metrics: ["quotations", "negotiations_resolved", "paid_bookings"],
    match: ["closure", "negotiation", "closer"],
  },
  {
    roleId: "SUP-ACQ", playbookId: "pb_role_sup_acq", roleName: "Supply Acquisition Executive", department: "Supply Operations",
    result: "Verified, commercially approved, sellable bed capacity added where demand is strongest.",
    p1: "Use zone demand, lost reasons and inventory gaps to target the right owners and properties.",
    p2: "Verify the property, commercials, operating authority and sellable room or bed potential.",
    p3: "Complete the onboarding pack, reject weak supply and transfer approved property with clear commitments.",
    metrics: ["owner_conversations", "property_verifications", "beds_added"],
    match: ["supply acquisition", "acquisition"],
  },
  {
    roleId: "SUP-OWNER", playbookId: "pb_role_sup_owner", roleName: "Supply Coordinator & Owner Success Executive", department: "Supply Operations",
    result: "Fresh, owner-confirmed, tour-ready and booking-honoured inventory across the portfolio.",
    p1: "Run the daily truth: owners, available, vacating and blocked beds, tours, holds, bookings and tomorrow's check-ins.",
    p2: "Support tour access and negotiation in real time and convert every verbal commitment into a system record.",
    p3: "Clear stale inventory, reconcile bookings and close owner commitments for the day.",
    metrics: ["properties_verified", "hold_responses", "readiness_assigned"],
    match: ["supply coordinator", "owner success"],
  },
  {
    roleId: "SUP-INVENTORY", playbookId: "pb_role_sup_inventory", roleName: "Inventory Controller", department: "Supply Operations",
    result: "Accurate, fresh, uniquely addressable bed-level inventory with zero double booking.",
    p1: "Review stale beds, current availability, holds, bookings, notice dates and mismatches.",
    p2: "Process status changes and reconcile owner, booking and physical evidence at exact-bed level.",
    p3: "Lock unresolved mismatches, publish safe sellable inventory and assign tomorrow's reconciliation.",
    metrics: ["bed_updates", "mismatches_resolved", "stale_beds_cleared"],
    match: ["inventory"],
  },
  {
    roleId: "SUP-READY", playbookId: "pb_role_sup_ready", roleName: "Property Verification & Readiness Executive", department: "Supply Operations",
    result: "Verified properties and ready check-ins with no preventable failure at arrival.",
    p1: "Review due verifications and tomorrow's check-ins, and assign property contact and evidence requirements.",
    p2: "Verify cleaning, bed, storage, work setup, connectivity, utilities, access, documents and exact allocation.",
    p3: "Resolve risk, approve alternatives where required and transfer a complete readiness pack.",
    metrics: ["checkins_verified", "readiness_packs", "evidence_uploads"],
    match: ["readiness", "verification"],
  },
  {
    roleId: "SUP-OWNEREXT", playbookId: "pb_role_sup_ownerext", roleName: "Property Owner / Operator", department: "Supply Operations",
    result: "Owner commitments stay accurate, timely and honoured from availability through check-in.",
    p1: "Verify every active room and bed, and report vacancy, occupancy, notice, blocked and maintenance status.",
    p2: "Provide tour access, respond to approved commercial requests and honour timed holds.",
    p3: "Acknowledge paid bookings, prepare rooms and close unresolved commitments.",
    metrics: ["rooms_updated", "hold_responses", "bookings_acknowledged"],
    match: ["property owner", "owner /"],
  },
  {
    roleId: "SUP-PM", playbookId: "pb_role_sup_pm", roleName: "Property Manager", department: "Supply Operations",
    result: "Customers tour and check in to the correct ready room without property-side failure.",
    p1: "Review today's tours, readiness work, check-ins and open property issues.",
    p2: "Provide access, show the approved room honestly, prepare rooms and resolve assigned physical tasks.",
    p3: "Confirm execution with evidence, update occupancy and escalate unresolved property risk.",
    metrics: ["access_provided", "readiness_tasks", "issues_resolved"],
    match: ["property manager"],
  },
  {
    roleId: "CX-BOOK", playbookId: "pb_role_cx_book", roleName: "Booking & Payment Controller", department: "Booking & Customer Experience",
    result: "Verified bookings with correct money, exact Bed ID, owner acknowledgement and no duplicate allocation.",
    p1: "Review pending payments, accepted offers, expiring holds and incomplete booking packs.",
    p2: "Verify money, exact bed, commercials, customer details, owner acknowledgement and inventory transition.",
    p3: "Clear booking exceptions, hand over check-ins and reconcile amounts pending.",
    metrics: ["payments_verified", "bookings_created", "receipts_issued"],
    match: ["booking & payment", "payment controller"],
  },
  {
    roleId: "CX-CHECKIN", playbookId: "pb_role_cx_checkin", roleName: "Check-in & Customer Delight Executive", department: "Booking & Customer Experience",
    result: "Customers receive the correct ready room and confirm possession.",
    p1: "Confirm customer ETA, booking, payment, exact room or bed, readiness and property contact.",
    p2: "Guide arrival, validate allocation, complete documentation and own immediate experience issues.",
    p3: "Confirm possession, move the bed to occupied and hand over an accurate tenant record.",
    metrics: ["checkins_done", "docs_completed", "issues_resolved"],
    match: ["check-in", "checkin", "customer delight"],
  },
  {
    roleId: "CX-GUILD", playbookId: "pb_role_cx_guild", roleName: "Tenant Guild / After-Sales Executive", department: "Booking & Customer Experience",
    result: "Tenant issues are acknowledged fast, resolved with evidence and closed with tenant confirmation.",
    p1: "Triage open tickets by priority, tenant impact, age, owner and dependency.",
    p2: "Coordinate property and owner execution, keep the tenant updated and verify evidence of resolution.",
    p3: "Close only with tenant confirmation, identify repeat root causes and surface renewal opportunities.",
    metrics: ["tickets", "p1_resolved", "tenant_closures"],
    match: ["tenant guild", "after-sales", "after sales"],
  },
  {
    roleId: "QPP-QA", playbookId: "pb_role_qpp_qa", roleName: "Quality Auditor", department: "Quality & People Performance",
    result: "Evidence-backed audit findings that separate isolated error from systemic failure.",
    p1: "Select risk-based and random samples across people, zones, channels and funnel stages.",
    p2: "Score against one rubric and attach evidence for every finding.",
    p3: "Publish findings, verify corrective action and feed recurring issues into training.",
    metrics: ["call_audits", "chat_audits", "findings_published"],
    match: ["quality auditor", "auditor", "quality"],
  },
  {
    roleId: "QPP-ENFORCE", playbookId: "pb_role_qpp_enforce", roleName: "Performance Enforcer", department: "Quality & People Performance",
    result: "Every critical performance gap is actioned the same day with a measurable correction.",
    p1: "Review the exception queue: idle time, missed updates, low output, overdue work and data failures.",
    p2: "Diagnose the first broken stage, assign a measurable correction and protect customers and revenue.",
    p3: "Verify recovery, close evidence and update coaching history.",
    metrics: ["exceptions_actioned", "corrections_assigned", "recoveries_verified"],
    match: ["enforcer", "performance enforcer"],
  },
  {
    roleId: "QPP-HRMS", playbookId: "pb_role_qpp_hrms", roleName: "HRMS & Workforce Control Executive", department: "Quality & People Performance",
    result: "Attendance, today queue and daily truth are complete, owned and locked.",
    p1: "Validate roster, attendance, late and absent cases, role and zone mapping, and today queue creation.",
    p2: "Monitor updates, breaks, idle exceptions and approval workflows, and route them to managers.",
    p3: "Close exceptions, lock daily truth and prepare payroll-ready records.",
    metrics: ["roster_checks", "updates_chased", "exceptions_closed"],
    match: ["hrms", "workforce"],
  },
  {
    roleId: "LDR-TEAM", playbookId: "pb_role_ldr_team", roleName: "Team Lead", department: "Leadership & Business Management",
    result: "Team target achieved with most members at or above minimum KRA.",
    p1: "Set the team goal, assign exact workload and three priorities per person, and confirm capacity.",
    p2: "Compare plan versus actual, coach the first broken stage and reassign work.",
    p3: "Close outcomes, verify evidence and assign recovery and carry-forward.",
    metrics: ["oneones_done", "plan_vs_actual_reviews", "interventions_done"],
    match: ["team lead", "floor lead", "coach"],
  },
  {
    roleId: "LDR-ZONE", playbookId: "pb_role_ldr_zone", roleName: "Zone Lead", department: "Leadership & Business Management",
    result: "The zone booking promise is delivered with focus inventory ready and SLAs held.",
    p1: "Count today, 7-day and 30-day demand, select focus inventory and allocate booking promises.",
    p2: "Run the 1 PM and 5 PM control on funnel, tours, exact beds, quotations, holds, owners and people.",
    p3: "Deliver or forecast the zone result, close risks and submit one evidence-based zone truth.",
    metrics: ["zone_bookings", "focus_properties_ready", "interventions_done"],
    match: ["zone lead", "zone"],
  },
  {
    roleId: "LDR-DEPT", playbookId: "pb_role_ldr_dept", roleName: "Department Lead / Operations Manager", department: "Leadership & Business Management",
    result: "Department result delivered with clean cross-team handoffs and same-day blocker clearance.",
    p1: "Set outcome architecture, capacity, role scorecards and the few priorities that decide the day.",
    p2: "Review exceptions across demand, visits, supply, booking, experience and people, then decide resources.",
    p3: "Reconcile the business result, customer and supply health, and structural actions for the next cycle.",
    metrics: ["decisions_made", "blockers_cleared", "handoff_reviews"],
    match: ["department lead", "operations manager", "ops manager", "leadership", "admin"],
  },
];

// ---- WhatsApp phase templates (kept short; the phase composer writes the full update) ----
const WA_ROLE_START = `*GHARPAYY · ON THE FLOOR*
{{name}} · {{role}} · {{time}}
I am logged in and starting my day.`;

const WA_ROLE_GOAL = `*GHARPAYY · TODAY'S GOAL*
{{name}} · {{role}} · {{time}}

My three priorities
1. {{mission_1}}
2. {{mission_2}}
3. {{mission_3}}

Result I am committing to: {{goal}}
Where I could get stuck: {{biggest_risk}}
I will finish by: {{expected_finish}}`;

const WA_ROLE_PHASE = `*GHARPAYY · PHASE UPDATE*
{{name}} · {{role}} · {{time}}

What I got done: {{wins}}
What slowed me down: {{blockers}}
What I will do differently next: {{cycle_note}}`;

const WA_ROLE_BREAK = `*GHARPAYY · BREAK*
{{name}} · {{role}} · {{time}}
Taking my break, back on the floor by {{expected_finish}}.`;

const WA_ROLE_EOD = `*GHARPAYY · END OF DAY*
{{name}} · {{role}} · {{time}}

What I delivered: {{wins}}
What held me back: {{blockers}}
What I learned: {{learning}}
Mistake I am fixing: {{mistake}}
My number one for tomorrow: {{tomorrow_priority}}`;

const GOAL_FIELDS = [
  "mission_1", "mission_2", "mission_3",
  "goal", "biggest_risk", "expected_finish", "energy",
];

/** Build the daily flow (playbook) for one role. */
export function buildRolePlaybook(f: RoleFlow): Playbook {
  const outcome = (extra: string[] = []) => [...f.metrics, "wins", "blockers", "cycle_note", ...extra];
  const stages: StageDef[] = [
    {
      id: "login", label: "Attendance check-in", time: "10:15",
      proofs: ["selfie", "geo"], fields: [], waTemplate: WA_ROLE_START, weight: 5,
    },
    {
      id: "mission", label: "Today's goal", time: "10:15–10:45",
      proofs: [], fields: [...GOAL_FIELDS, ...f.metrics],
      requiredFields: ["mission_1", "goal", "biggest_risk", "expected_finish"],
      waTemplate: WA_ROLE_GOAL, weight: 12,
    },
    {
      id: "c1_draft", label: "First half plan", time: "10:45",
      proofs: ["crm_ss"], fields: [...f.metrics, "cycle_note"],
      requiredFields: f.metrics.slice(0, 1), waTemplate: "", weight: 8,
    },
    {
      id: "c1_outcome", label: "First half result", time: "12:45",
      proofs: ["crm_ss"], fields: outcome(),
      requiredFields: f.metrics, waTemplate: WA_ROLE_PHASE, weight: 12,
    },
    {
      id: "pre_break", label: "1:00 PM update", time: "13:00",
      proofs: ["whatsapp"], fields: [...f.metrics, "wins", "blockers", "tomorrow_priority"],
      requiredFields: ["wins"], waTemplate: WA_ROLE_PHASE, weight: 10,
    },
    {
      id: "break1", label: "Break", time: "13:15–13:30",
      proofs: ["selfie"], fields: ["expected_finish"], waTemplate: WA_ROLE_BREAK, weight: 3,
    },
    {
      id: "resume", label: "Back on the floor", time: "13:30",
      proofs: ["selfie"], fields: [], waTemplate: WA_ROLE_START, weight: 3,
    },
    {
      id: "c2_calls", label: "Second half work", time: "13:30–17:00",
      proofs: ["crm_ss"], fields: [...f.metrics, "cycle_note"],
      requiredFields: f.metrics.slice(0, 1), waTemplate: "", weight: 10,
    },
    {
      id: "c2_outcome", label: "5:00 PM update", time: "17:00",
      proofs: ["selfie", "whatsapp"], fields: outcome(["tomorrow_priority"]),
      requiredFields: f.metrics, waTemplate: WA_ROLE_PHASE, weight: 12,
    },
    {
      id: "c3_final", label: "Final push", time: "17:00–20:00",
      proofs: ["crm_ss"], fields: outcome(),
      requiredFields: f.metrics, waTemplate: WA_ROLE_PHASE, weight: 12,
    },
    {
      id: "impact", label: "End of day submission", time: "By 20:00",
      proofs: ["selfie", "whatsapp"],
      fields: [...f.metrics, "wins", "blockers", "learning", "mistake", "tomorrow_priority"],
      requiredFields: ["wins", "learning", "tomorrow_priority", ...f.metrics],
      waTemplate: WA_ROLE_EOD, weight: 18,
    },
  ];

  return {
    id: f.playbookId,
    name: `${f.roleName}`,
    roleHint: f.roleName,
    description: `${f.department} · ${f.result}`,
    version: 1,
    active: true,
    builtIn: true,
    createdAt: 0,
    stages,
  };
}

export const ROLE_PLAYBOOKS: Playbook[] = ROLE_FLOWS.map(buildRolePlaybook);

/** Resolve a free-text role name to one of the KRA role flows. */
export function roleFlowFor(role: string): RoleFlow | undefined {
  const r = (role || "").toLowerCase();
  return ROLE_FLOWS.find((f) => f.match.some((k) => r.includes(k)))
      || ROLE_FLOWS.find((f) => f.roleName.toLowerCase() === r);
}

/** Phase labels for the day, taken straight from the operating model. */
export function phaseWorkFor(f: RoleFlow): Array<{ id: string; window: string; work: string }> {
  return [
    { id: "morning", window: "Shift start–1:00 PM", work: f.p1 },
    { id: "midday", window: "1:00–1:30 PM", work: "Send the 1:00 PM update, take the break, and restart with a clear next action." },
    { id: "evening", window: "1:00–8:00 PM", work: `${f.p2} Then: ${f.p3}` },
    { id: "eod", window: "By 8:00 PM", work: "Submit goal versus actual with evidence, pending cases, next owner and tomorrow's first priority." },
  ];
}
