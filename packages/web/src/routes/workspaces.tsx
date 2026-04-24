import { WorkspaceList } from "@/components/workspaces/WorkspaceList";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces")({
	component: WorkspaceList,
});
