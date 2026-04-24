import { PeerList } from "@/components/peers/PeerList";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers")({
	component: PeerList,
});
