import { SessionDetail } from "@/components/sessions/SessionDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/sessions_/$sessionId")({
	component: SessionDetail,
});
