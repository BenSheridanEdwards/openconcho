import { PeerDetail } from "@/components/peers/PeerDetail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers_/$peerId")({
	component: PeerDetail,
});
