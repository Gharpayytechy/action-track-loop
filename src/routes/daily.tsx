import { createFileRoute } from "@tanstack/react-router";
import { RoleFlowRunner } from "@/components/execution/RoleFlowRunner";

export const Route = createFileRoute("/daily")({
  validateSearch: (s: Record<string, unknown>): { pb?: string } => ({
    pb: typeof s.pb === "string" ? s.pb : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Role Flow \u00b7 Gharpayy Execution OS" },
      { name: "description", content: "Run your role flow on the 10:35 \u2192 1:15 \u2192 2:00 \u2192 5:00 \u2192 8:00 rhythm, with proofs, actuals and WhatsApp-ready updates built in." },
      { property: "og:title", content: "Role Flow \u00b7 Gharpayy Execution OS" },
      { property: "og:description", content: "Every checkpoint answers promise \u2192 actual \u2192 gap \u2192 next \u2192 outcome before any KPI is accepted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyPage,
});

function DailyPage() {
  const { pb } = Route.useSearch();
  return <RoleFlowRunner pb={pb} />;
}
