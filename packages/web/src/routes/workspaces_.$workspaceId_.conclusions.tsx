import { ConclusionBrowser } from "@/components/conclusions/ConclusionBrowser";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/conclusions")({
	component: ConclusionBrowser,
});
