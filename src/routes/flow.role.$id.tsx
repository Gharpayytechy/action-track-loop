import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { ROLE_FLOWS } from "@/lib/execution/role-flows";
import { RoleFlowRunner } from "@/components/execution/RoleFlowRunner";

function findFlow(id: string) {
  const key = id.toLowerCase();
  return ROLE_FLOWS.find(
    (f) => f.roleId.toLowerCase() === key || f.playbookId.toLowerCase() === key,
  );
}

export const Route = createFileRoute("/flow/role/$id")({
  loader: ({ params }) => {
    const f = findFlow(params.id);
    if (!f) throw notFound();
    return { roleName: f.roleName, result: f.result, department: f.department, roleId: f.roleId, playbookId: f.playbookId };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Role flow unavailable" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${loaderData.roleName} · Role Flow` },
        { name: "description", content: loaderData.result },
        { property: "og:title", content: `${loaderData.roleName} · Role Flow` },
        { property: "og:description", content: loaderData.result },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: RoleFlowById,
});

function RoleFlowById() {
  const { roleName, department, roleId, playbookId } = Route.useLoaderData();
  return (
    <div>
      <div className="px-4 md:px-8 pt-5 flex flex-wrap items-center gap-2">
        <Link to="/flows" className="inline-flex items-center gap-1 text-xs h-8 px-3 rounded-md border hover:bg-secondary">
          <ArrowLeft className="h-3.5 w-3.5" /> All role flows
        </Link>
        <Badge variant="outline" className="font-mono text-[10px]">{roleId}</Badge>
        <span className="text-xs text-muted-foreground">{department} · {roleName}</span>
      </div>
      <RoleFlowRunner pb={playbookId} />
    </div>
  );
}
