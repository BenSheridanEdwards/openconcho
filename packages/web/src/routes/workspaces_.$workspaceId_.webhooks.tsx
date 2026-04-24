import { WebhookManager } from "@/components/workspaces/WebhookManager";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/webhooks")({
	component: WebhookManagerPage,
});

function WebhookManagerPage() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	return <WebhookManager workspaceId={workspaceId} />;
}
