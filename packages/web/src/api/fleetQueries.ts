import type { UseQueryOptions } from "@tanstack/react-query";
import type { components } from "@/api/schema.d.ts";
import { createScopedClient } from "@/api/scopedClient";
import type { Instance } from "@/lib/config";

type Workspace = components["schemas"]["Workspace"];
type Conclusion = components["schemas"]["Conclusion"];

function err(e: unknown): never {
	throw new Error(typeof e === "object" ? JSON.stringify(e) : String(e));
}

// Keys are scoped by instance.id so caches never collide across the fan-out.
const FK = {
	workspaces: (instId: string, page: number, size: number) =>
		["fleet", instId, "workspaces", page, size] as const,
	conclusionsQuery: (instId: string, wsId: string, q: string, filters: Record<string, unknown>) =>
		["fleet", instId, "conclusions-query", wsId, q, filters] as const,
};

export interface WorkspacesListResponse {
	items?: Workspace[];
	total?: number;
	page?: number;
	size?: number;
	pages?: number;
}

export function scopedWorkspacesQueryOptions(
	instance: Instance,
	page = 1,
	pageSize = 20,
): UseQueryOptions<WorkspacesListResponse> {
	return {
		queryKey: [...FK.workspaces(instance.id, page, pageSize)],
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.POST("/v3/workspaces/list", {
				params: { query: { page, page_size: pageSize } },
				body: {},
			});
			return (data as WorkspacesListResponse) ?? err(error);
		},
	};
}

export function scopedQueryConclusionsQueryOptions(
	instance: Instance,
	workspaceId: string,
	query: string,
	filters: Record<string, unknown> = {},
	topK = 10,
	enabled = true,
): UseQueryOptions<Conclusion[]> {
	return {
		queryKey: [...FK.conclusionsQuery(instance.id, workspaceId, query, { ...filters, topK })],
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.POST("/v3/workspaces/{workspace_id}/conclusions/query", {
				params: { path: { workspace_id: workspaceId } },
				// Honcho's ConclusionQuery expects filters nested under `filters`,
				// not spread at the top level. (`useQueryConclusions` in queries.ts
				// uses the legacy spread form, which only works with empty filters.)
				body: {
					query,
					top_k: topK,
					...(Object.keys(filters).length > 0 ? { filters } : {}),
				},
			});
			return (data as Conclusion[] | undefined) ?? err(error);
		},
		enabled: enabled && Boolean(workspaceId) && Boolean(query),
	};
}

/**
 * Derive an observer peer name from a workspace ID. Honcho convention is
 * `<agent>-<purpose>` (e.g. `neo-personal`, `jeeves-codewalnut`); the prefix
 * is the agent's "self" peer, which is the natural observer for semantic
 * queries about another peer.
 */
export function deriveObserverFromWorkspaceId(workspaceId: string): string {
	const dash = workspaceId.indexOf("-");
	return dash > 0 ? workspaceId.slice(0, dash) : workspaceId;
}
