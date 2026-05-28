import { createFileRoute } from "@tanstack/react-router";
import { IdentityAudit } from "@/components/audit/IdentityAudit";

interface AuditSearch {
	peer?: string;
}

export const Route = createFileRoute("/audit")({
	validateSearch: (search: Record<string, unknown>): AuditSearch => ({
		peer: typeof search.peer === "string" ? search.peer : undefined,
	}),
	component: IdentityAudit,
});
