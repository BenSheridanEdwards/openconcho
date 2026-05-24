import { createFileRoute } from "@tanstack/react-router";
import { CompareView } from "@/components/compare/CompareView";

interface CompareSearch {
	instances?: string;
	peer?: string;
}

export const Route = createFileRoute("/compare")({
	validateSearch: (search: Record<string, unknown>): CompareSearch => ({
		instances: typeof search.instances === "string" ? search.instances : undefined,
		peer: typeof search.peer === "string" ? search.peer : undefined,
	}),
	component: CompareView,
});
