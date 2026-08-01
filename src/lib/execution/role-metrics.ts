// Role metric fields sourced from the Gharpayy Role + KRA system (v1.0).
// Kept dependency-free so both the field library and the role flows can use it
// without an import cycle.

export interface RoleMetricField {
  id: string;
  label: string;
  type: "kpiChip" | "number" | "percent";
  group: string;
  defaultTarget?: number;
  description?: string;
}

const m = (
  id: string,
  label: string,
  group: string,
  defaultTarget?: number,
  description?: string,
): RoleMetricField => ({ id, label, type: "kpiChip", group, defaultTarget, description });

export const ROLE_METRIC_FIELDS: RoleMetricField[] = [
  // Demand Operations
  m("enquiries_captured", "Enquiries captured", "Demand", 40, "Source enquiries turned into clean CRM leads"),
  m("leads_deduped", "Duplicates merged", "Demand", 5),
  m("wrong_zone_fixed", "Zone corrections", "Demand", 5),
  m("leads_assigned", "Leads assigned", "Demand", 60),
  m("sla_interventions", "SLA interventions", "Demand", 10),
  m("revival_pool", "Revival pool built", "Demand", 30),
  m("leads_progressed", "Leads progressed", "Demand", 40),
  m("qualified_tours", "Qualified tours scheduled", "Demand", 10),
  m("revival_attempts", "Revival attempts", "Demand", 30),
  m("revival_connects", "Revival conversations", "Demand", 10),
  m("reactivated_leads", "Leads reactivated", "Demand", 5),

  // Visit & Conversion
  m("tours_confirmed", "Tours confirmed", "Visits", 10),
  m("tours_completed", "Tours completed", "Visits", 9),
  m("post_tour_reports", "Post-tour reports filed", "Visits", 9),
  m("tours_tracked", "Tours tracked live", "Visits", 20),
  m("delay_interventions", "Delay interventions", "Visits", 5),
  m("noshow_recovered", "No-shows recovered", "Visits", 3),
  m("visits_completed", "Visits completed", "Visits", 10),
  m("ontime_arrivals", "On-time arrivals", "Visits", 10),
  m("handovers_done", "Handovers completed", "Visits", 10),
  m("negotiations_resolved", "Negotiations resolved", "Closing", 5),
  m("paid_bookings", "Paid bookings", "Closing", 3),

  // Supply Operations
  m("owner_conversations", "Qualified owner conversations", "Supply", 5),
  m("property_verifications", "Property verifications", "Supply", 2),
  m("beds_added", "Sellable beds added", "Supply", 10),
  m("properties_verified", "Properties verified", "Supply", 10),
  m("hold_responses", "Hold requests answered", "Supply", 5),
  m("readiness_assigned", "Readiness jobs assigned", "Supply", 5),
  m("bed_updates", "Bed status updates", "Supply", 20),
  m("mismatches_resolved", "Mismatches resolved", "Supply", 5),
  m("stale_beds_cleared", "Stale beds cleared", "Supply", 10),
  m("checkins_verified", "Tomorrow check-ins verified", "Supply", 5),
  m("readiness_packs", "Readiness packs completed", "Supply", 5),
  m("evidence_uploads", "Evidence sets uploaded", "Supply", 5),
  m("rooms_updated", "Rooms updated", "Supply", 10),
  m("bookings_acknowledged", "Bookings acknowledged", "Supply", 3),
  m("access_provided", "Tour access provided", "Supply", 5),
  m("readiness_tasks", "Readiness tasks closed", "Supply", 5),

  // Booking & Customer Experience
  m("payments_verified", "Payments verified", "Booking", 3),
  m("bookings_created", "Bookings created", "Booking", 3),
  m("receipts_issued", "Receipts issued", "Booking", 3),
  m("checkins_done", "Check-ins completed", "Booking", 3),
  m("docs_completed", "Documentation packs completed", "Booking", 3),
  m("issues_resolved", "Issues resolved", "Support", 5),
  m("p1_resolved", "P1 cases resolved", "Support", 2),
  m("tenant_closures", "Tenant-confirmed closures", "Support", 5),

  // Quality & People Performance
  m("call_audits", "Call audits", "Quality", 10),
  m("chat_audits", "Chat audits", "Quality", 10),
  m("findings_published", "Findings published", "Quality", 5),
  m("exceptions_actioned", "Exceptions actioned", "Quality", 10),
  m("corrections_assigned", "Corrections assigned", "Quality", 5),
  m("recoveries_verified", "Recoveries verified", "Quality", 5),
  m("roster_checks", "Roster checks completed", "Quality", 1),
  m("updates_chased", "Missing updates chased", "Quality", 5),
  m("exceptions_closed", "Exceptions closed", "Quality", 10),

  // Leadership
  m("plan_vs_actual_reviews", "Plan vs actual reviews", "Manager", 3),
  m("interventions_done", "Interventions completed", "Manager", 5),
  m("zone_bookings", "Zone bookings", "Manager", 10),
  m("focus_properties_ready", "Focus properties ready", "Manager", 3),
  m("decisions_made", "Decisions made", "Manager", 3),
  m("blockers_cleared", "Blockers cleared", "Manager", 3),
  m("handoff_reviews", "Cross-team handoffs reviewed", "Manager", 3),
];
