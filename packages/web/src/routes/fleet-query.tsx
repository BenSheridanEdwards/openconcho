import { createFileRoute } from "@tanstack/react-router";
import { type FleetQuerySearch, FleetQueryView } from "@/components/fleetQuery/FleetQueryView";

export const Route = createFileRoute("/fleet-query")({
	validateSearch: (search: Record<string, unknown>): FleetQuerySearch => ({
		q: typeof search.q === "string" ? search.q : undefined,
		peer: typeof search.peer === "string" ? search.peer : undefined,
		view: search.view === "merged" || search.view === "grouped" ? search.view : undefined,
		instances: typeof search.instances === "string" ? search.instances : undefined,
	}),
	component: FleetQueryView,
});
