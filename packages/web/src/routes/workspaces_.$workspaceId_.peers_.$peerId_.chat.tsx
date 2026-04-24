import { ChatPage } from "@/components/chat/ChatPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces_/$workspaceId_/peers_/$peerId_/chat")({
	component: ChatPage,
});
