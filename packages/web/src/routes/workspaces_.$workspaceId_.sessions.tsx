import { SessionList } from "@/components/sessions/SessionList";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/sessions")({
	component: SessionList,
});
