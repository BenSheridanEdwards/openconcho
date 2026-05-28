import { createFileRoute } from "@tanstack/react-router";
import { ConclusionDiffView } from "@/components/conclusions/ConclusionDiffView";

export const Route = createFileRoute("/workspaces_/$workspaceId_/diff")({
	component: ConclusionDiffView,
});
