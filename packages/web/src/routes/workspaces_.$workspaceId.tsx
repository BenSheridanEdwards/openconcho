import { WorkspaceDetail } from "@/components/workspaces/WorkspaceDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId")({
	component: WorkspaceDetail,
});
