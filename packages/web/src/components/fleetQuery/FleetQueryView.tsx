import { useQueries } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Eye, Layers, Network, Search } from "lucide-react";
import { useMemo } from "react";
import {
	deriveObserverFromWorkspaceId,
	type PeersListResponse,
	scopedPeersQueryOptions,
	scopedQueryConclusionsQueryOptions,
	scopedWorkspacesQueryOptions,
	type WorkspacesListResponse,
} from "@/api/fleetQueries";
import type { components } from "@/api/schema.d.ts";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Skeleton } from "@/components/shared/Skeleton";
import { TimestampChip } from "@/components/shared/TimestampChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Body, Caption, MonoCaption, Muted, PageTitle } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { useInstances } from "@/hooks/useInstances";
import type { Instance } from "@/lib/config";
import { COLOR } from "@/lib/constants";

type Conclusion = components["schemas"]["Conclusion"];

export interface FleetQuerySearch {
	q?: string;
	peer?: string;
	view?: "grouped" | "merged";
	instances?: string;
}

export interface FleetQueryResultRow {
	conclusion: Conclusion;
	instance: Instance;
	score: number;
	rank: number;
}

export interface FleetQueryGroup {
	instance: Instance;
	workspaceId: string | undefined;
	rows: FleetQueryResultRow[];
	isLoading: boolean;
	error: Error | null;
}

const DEFAULT_PEER = "ben";
const TOP_K = 10;

export function FleetQueryView() {
	const { mask } = useDemo();
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as FleetQuerySearch;
	const { instances } = useInstances();

	const query = search.q ?? "";
	const peer = search.peer ?? DEFAULT_PEER;
	const view = search.view ?? "grouped";

	const selectedIds = useMemo(() => {
		if (typeof search.instances !== "string") return null;
		const ids = search.instances.split(",").filter(Boolean);
		return ids.length > 0 ? ids : [];
	}, [search.instances]);

	const selected: Instance[] = useMemo(() => {
		if (selectedIds === null) return instances;
		const set = new Set(selectedIds);
		return instances.filter((i) => set.has(i.id));
	}, [instances, selectedIds]);

	function setSearch(patch: Partial<FleetQuerySearch>) {
		navigate({
			to: "/fleet-query" as never,
			search: { ...search, ...patch } as never,
		});
	}

	function toggleInstance(id: string) {
		const currentlySelected = new Set(selected.map((i) => i.id));
		if (currentlySelected.has(id)) currentlySelected.delete(id);
		else currentlySelected.add(id);
		const next = instances.filter((i) => currentlySelected.has(i.id)).map((i) => i.id);
		setSearch({
			instances: next.length === 0 || next.length === instances.length ? undefined : next.join(","),
		});
	}

	// Step 1: discover the first workspace per selected instance.
	const workspacesResults = useQueries({
		queries: selected.map((inst) => scopedWorkspacesQueryOptions(inst, 1, 1)),
	});

	const workspaceByInstance = useMemo(() => {
		const map = new Map<string, string>();
		selected.forEach((inst, idx) => {
			const wsId = (workspacesResults[idx]?.data as WorkspacesListResponse | undefined)?.items?.[0]
				?.id;
			if (wsId) map.set(inst.id, wsId);
		});
		return map;
	}, [selected, workspacesResults]);

	// Step 1b: fan out peers/list per selected instance, then union the IDs so
	// the "About peer" dropdown shows every peer the fleet collectively knows.
	const peersResults = useQueries({
		queries: selected.map((inst) => {
			const wsId = workspaceByInstance.get(inst.id) ?? "";
			return scopedPeersQueryOptions(inst, wsId);
		}),
	});

	const availablePeers = useMemo<string[]>(() => {
		const ids = new Set<string>();
		selected.forEach((inst, idx) => {
			const items = (peersResults[idx]?.data as PeersListResponse | undefined)?.items ?? [];
			const observer = deriveObserverFromWorkspaceId(workspaceByInstance.get(inst.id) ?? "");
			for (const p of items) {
				// Skip each instance's own "self" peer — it can't be the observed.
				if (p.id && p.id !== observer) ids.add(p.id);
			}
		});
		// Stable order: alphabetical, with the default peer pinned to the top if present.
		const sorted = [...ids].sort((a, b) => a.localeCompare(b));
		const idx = sorted.indexOf(DEFAULT_PEER);
		if (idx > 0) {
			sorted.splice(idx, 1);
			sorted.unshift(DEFAULT_PEER);
		}
		return sorted;
	}, [selected, peersResults, workspaceByInstance]);

	const peersLoading = peersResults.some((r) => r.isLoading);

	// Step 2: run the semantic query against each instance's first workspace.
	// Honcho's conclusions/query requires BOTH observer_id and observed_id —
	// observer is the agent's "self" peer (derived from the workspace ID),
	// observed is the peer the query is about.
	const queryResults = useQueries({
		queries: selected.map((inst) => {
			const wsId = workspaceByInstance.get(inst.id) ?? "";
			const observer = wsId ? deriveObserverFromWorkspaceId(wsId) : "";
			const filters: Record<string, unknown> = {};
			if (observer) filters.observer_id = observer;
			if (peer) filters.observed_id = peer;
			return scopedQueryConclusionsQueryOptions(
				inst,
				wsId,
				query,
				filters,
				TOP_K,
				Boolean(query) && Boolean(wsId) && Boolean(observer) && Boolean(peer),
			);
		}),
	});

	const groupedResults = useMemo<FleetQueryGroup[]>(() => {
		return selected.map((inst, idx) => {
			const data = queryResults[idx]?.data as Conclusion[] | undefined;
			const wsId = workspaceByInstance.get(inst.id);
			const conclusions = Array.isArray(data) ? data : [];
			const rows: FleetQueryResultRow[] = conclusions.map((c, i) => ({
				conclusion: c,
				instance: inst,
				score: conclusions.length > 0 ? 1 - i / conclusions.length : 0,
				rank: i,
			}));
			return {
				instance: inst,
				workspaceId: wsId,
				rows,
				isLoading:
					(workspacesResults[idx]?.isLoading ?? false) ||
					(Boolean(query) && Boolean(wsId) && (queryResults[idx]?.isLoading ?? false)),
				error: workspacesResults[idx]?.error ?? queryResults[idx]?.error ?? null,
			};
		});
	}, [selected, workspacesResults, queryResults, workspaceByInstance, query]);

	const mergedRows = useMemo<FleetQueryResultRow[]>(() => {
		const all = groupedResults.flatMap((g) => g.rows);
		return [...all].sort((a, b) => b.score - a.score);
	}, [groupedResults]);

	const anyLoading = groupedResults.some((g) => g.isLoading);
	const totalResults = mergedRows.length;

	if (instances.length === 0) {
		return (
			<div className="page-container page-container--wide">
				<PageTitle>Fleet query</PageTitle>
				<Body className="mt-2">
					Configure at least one Honcho instance in Settings before querying the fleet.
				</Body>
			</div>
		);
	}

	return (
		<div className="page-container page-container--wide">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<div className="flex items-center gap-2 mb-1">
					<Network className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<PageTitle>Fleet query</PageTitle>
				</div>
				<Muted className="mt-0.5">
					Semantic search across every selected instance's first workspace. Shows what the fleet
					collectively knows about a topic.
				</Muted>
			</motion.div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					const formData = new FormData(e.currentTarget);
					setSearch({
						q: String(formData.get("q") ?? "").trim() || undefined,
						peer: String(formData.get("peer") ?? "").trim() || undefined,
					});
				}}
				className="space-y-3 mb-6"
			>
				<div className="flex flex-col sm:flex-row gap-2">
					<div className="relative flex-1">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
							style={{ color: "var(--text-4)" }}
							strokeWidth={1.5}
						/>
						<Input
							name="q"
							type="text"
							defaultValue={query}
							placeholder="What does the fleet collectively know about..."
							className="rounded-xl pl-9 pr-4 py-2.5"
							aria-label="Query"
						/>
					</div>
					<div className="flex items-center gap-2">
						<label
							className="text-xs font-medium whitespace-nowrap"
							style={{ color: "var(--text-3)" }}
							htmlFor="fleet-query-peer"
						>
							About peer
						</label>
						<select
							id="fleet-query-peer"
							name="peer"
							key={peer}
							defaultValue={peer}
							disabled={availablePeers.length === 0}
							className="rounded-xl px-3 py-2.5 text-sm font-mono outline-none transition-colors"
							style={{
								background: "var(--surface)",
								color: "var(--text-1)",
								border: "1px solid var(--border-2)",
								minWidth: "10rem",
							}}
							aria-label="Peer name"
						>
							{peer && !availablePeers.includes(peer) && <option value={peer}>{peer}</option>}
							{availablePeers.length === 0 && (
								<option value="">{peersLoading ? "Loading peers…" : "No peers discovered"}</option>
							)}
							{availablePeers.map((p) => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
					</div>
					<Button type="submit" variant="primary" className="rounded-xl">
						Search
					</Button>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Caption as="span" className="font-medium" style={{ color: "var(--text-3)" }}>
						Instances:
					</Caption>
					{instances.map((inst) => {
						const checked = selected.some((s) => s.id === inst.id);
						return (
							<label
								key={inst.id}
								className="flex items-center gap-1.5 text-xs cursor-pointer"
								style={{ color: checked ? "var(--text-1)" : "var(--text-3)" }}
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => toggleInstance(inst.id)}
									className="accent-current"
									aria-label={`Toggle ${inst.name}`}
								/>
								<span className="font-medium">{inst.name}</span>
								<MonoCaption className="hidden md:inline">
									{mask(inst.baseUrl.replace(/^https?:\/\//, ""))}
								</MonoCaption>
							</label>
						);
					})}
				</div>

				<div className="flex items-center gap-2">
					<ViewToggle current={view} onChange={(v) => setSearch({ view: v })} />
					{query && totalResults > 0 && (
						<Caption as="span" style={{ color: "var(--text-4)" }}>
							{totalResults} result{totalResults === 1 ? "" : "s"} across {selected.length} instance
							{selected.length === 1 ? "" : "s"}
						</Caption>
					)}
				</div>
			</form>

			{!query && (
				<EmptyState
					icon={Search}
					title="Enter a query to search the fleet"
					description="Each selected instance's first workspace will be searched in parallel."
				/>
			)}

			{query && selected.length === 0 && (
				<EmptyState
					icon={Layers}
					title="No instances selected"
					description="Select at least one instance to run a fleet query."
				/>
			)}

			{query && selected.length > 0 && view === "grouped" && (
				<GroupedResults groups={groupedResults} />
			)}

			{query && selected.length > 0 && view === "merged" && (
				<MergedResults
					rows={mergedRows}
					loading={anyLoading}
					errors={groupedResults.map((g) => g.error).filter((e): e is Error => Boolean(e))}
				/>
			)}
		</div>
	);
}

function ViewToggle({
	current,
	onChange,
}: {
	current: "grouped" | "merged";
	onChange: (v: "grouped" | "merged") => void;
}) {
	return (
		<div
			role="tablist"
			aria-label="Result view"
			className="inline-flex rounded-lg p-0.5"
			style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
		>
			{(["grouped", "merged"] as const).map((mode) => {
				const active = current === mode;
				return (
					<button
						key={mode}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(mode)}
						className="px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize"
						style={{
							background: active ? "var(--accent-dim)" : "transparent",
							color: active ? "var(--accent-text)" : "var(--text-3)",
						}}
					>
						{mode}
					</button>
				);
			})}
		</div>
	);
}

function GroupedResults({ groups }: { groups: FleetQueryGroup[] }) {
	return (
		<div className="space-y-6">
			{groups.map((g) => (
				<section key={g.instance.id}>
					<header className="flex items-center justify-between gap-2 mb-2">
						<div className="flex items-center gap-2 min-w-0">
							<span className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>
								{g.instance.name}
							</span>
							<MonoCaption className="truncate">{g.workspaceId ? g.workspaceId : "—"}</MonoCaption>
						</div>
						<Caption as="span" style={{ color: "var(--text-4)" }}>
							{g.rows.length} hit{g.rows.length === 1 ? "" : "s"}
						</Caption>
					</header>
					{g.error && <ErrorAlert error={g.error} />}
					{g.isLoading && <Skeleton className="h-20" />}
					{!g.isLoading && !g.error && g.rows.length === 0 && (
						<Body
							className="text-sm px-3 py-3 rounded-lg"
							style={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
								color: "var(--text-3)",
							}}
						>
							No matching conclusions in this instance.
						</Body>
					)}
					{g.rows.length > 0 && (
						<ul className="space-y-2">
							{g.rows.map((row) => (
								<ConclusionRow key={`${row.instance.id}:${row.conclusion.id}`} row={row} />
							))}
						</ul>
					)}
				</section>
			))}
		</div>
	);
}

function MergedResults({
	rows,
	loading,
	errors,
}: {
	rows: FleetQueryResultRow[];
	loading: boolean;
	errors: Error[];
}) {
	if (loading && rows.length === 0) return <Skeleton className="h-32" />;
	if (rows.length === 0 && errors.length === 0) {
		return (
			<EmptyState
				icon={Eye}
				title="No results"
				description="No conclusions matched across any selected instance."
			/>
		);
	}
	return (
		<div className="space-y-3">
			{errors.map((e, i) => (
				<ErrorAlert key={i} error={e} />
			))}
			<ul className="space-y-2">
				{rows.map((row) => (
					<ConclusionRow
						key={`${row.instance.id}:${row.conclusion.id}`}
						row={row}
						showInstanceTag
					/>
				))}
			</ul>
		</div>
	);
}

function ConclusionRow({
	row,
	showInstanceTag = false,
}: {
	row: FleetQueryResultRow;
	showInstanceTag?: boolean;
}) {
	const { mask } = useDemo();
	const c = row.conclusion;
	return (
		<li
			className="rounded-xl p-4"
			style={{
				background: "var(--surface)",
				border: "1px solid var(--border)",
			}}
		>
			<div className="flex items-start justify-between gap-3">
				<Body className="whitespace-pre-wrap flex-1">{mask(c.content)}</Body>
				<div className="flex flex-col items-end gap-1 shrink-0">
					{showInstanceTag && (
						<span
							className="text-xs font-medium px-2 py-0.5 rounded-full"
							style={{
								background: COLOR.accentSubtle,
								color: COLOR.accentText,
								border: `1px solid ${COLOR.accentBorder}`,
							}}
						>
							{row.instance.name}
						</span>
					)}
					<span
						className="text-xs font-mono"
						style={{ color: "var(--text-4)" }}
						title={`Rank ${row.rank + 1} within instance`}
					>
						{row.score.toFixed(2)}
					</span>
				</div>
			</div>
			<div
				className="flex items-center gap-3 mt-3 pt-2.5"
				style={{ borderTop: "1px solid var(--border)" }}
			>
				<div className="flex items-center gap-1.5">
					<Eye className="w-3 h-3" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
					<MonoCaption>{mask(c.observer_id)}</MonoCaption>
				</div>
				{c.observed_id && (
					<div className="flex items-center gap-1">
						<Caption>→</Caption>
						<MonoCaption>{mask(c.observed_id)}</MonoCaption>
					</div>
				)}
				{c.created_at && (
					<div className="ml-auto">
						<TimestampChip value={c.created_at.replace("T", " ").replace(/\.\d+Z?$/, "")} />
					</div>
				)}
			</div>
		</li>
	);
}
