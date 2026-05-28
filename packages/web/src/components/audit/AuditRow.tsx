import { Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useScopedPeerCard, useScopedPeers, useScopedWorkspaces } from "@/api/compareQueries";
import type { components } from "@/api/schema.d.ts";
import { Skeleton } from "@/components/shared/Skeleton";
import { MonoCaption } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import type { Instance } from "@/lib/config";
import { auditFacts } from "@/lib/peerCardFacts";

type Workspace = components["schemas"]["Workspace"];
type Peer = components["schemas"]["Peer"];

interface Props {
	instance: Instance;
	peerName: string;
	expectedFacts: string[];
}

export function AuditRow({ instance, peerName, expectedFacts }: Props) {
	const { mask } = useDemo();
	const [workspaceId, setWorkspaceId] = useState<string>("");

	const workspacesQuery = useScopedWorkspaces(instance);
	const peersQuery = useScopedPeers(instance, workspaceId);

	const workspaces: Workspace[] = useMemo(
		() => (workspacesQuery.data as { items?: Workspace[] } | undefined)?.items ?? [],
		[workspacesQuery.data],
	);

	useEffect(() => {
		if (workspaces.length > 0 && !workspaceId) setWorkspaceId(workspaces[0].id);
	}, [workspaces, workspaceId]);

	const peers: Peer[] = useMemo(
		() => (peersQuery.data as { items?: Peer[] } | undefined)?.items ?? [],
		[peersQuery.data],
	);

	const matchedPeer = useMemo(
		() => peers.find((p) => p.id.toLowerCase() === peerName.toLowerCase()),
		[peers, peerName],
	);
	const peerId = matchedPeer?.id ?? "";

	const cardQuery = useScopedPeerCard(instance, workspaceId, peerId);

	const cardLines: string[] = useMemo(() => {
		const raw = (cardQuery.data as { peer_card?: unknown } | undefined)?.peer_card;
		if (Array.isArray(raw)) return raw as string[];
		if (typeof raw === "string") return [raw];
		return [];
	}, [cardQuery.data]);

	const cells = useMemo(() => auditFacts(cardLines, expectedFacts), [cardLines, expectedFacts]);

	const wsError = workspacesQuery.error;
	const isLoadingWs = workspacesQuery.isLoading;
	const isLoadingPeers = Boolean(workspaceId) && peersQuery.isLoading;
	const isLoadingCard = Boolean(peerId) && cardQuery.isLoading;
	const peerMissing =
		!isLoadingWs && !isLoadingPeers && workspaceId !== "" && !matchedPeer && peers.length > 0;

	let status: { kind: "ok" } | { kind: "loading" } | { kind: "error"; message: string };
	if (wsError) {
		status = { kind: "error", message: "Workspace fetch failed" };
	} else if (isLoadingWs || isLoadingPeers || isLoadingCard) {
		status = { kind: "loading" };
	} else if (workspaces.length === 0) {
		status = { kind: "error", message: "No workspaces" };
	} else if (peerMissing) {
		status = { kind: "error", message: `Peer "${peerName}" not found` };
	} else if (cardQuery.error) {
		status = { kind: "error", message: "Card fetch failed" };
	} else {
		status = { kind: "ok" };
	}

	const foundCount = cells.filter((c) => c.found).length;

	return (
		<tr style={{ borderTop: "1px solid var(--border)" }}>
			<th
				scope="row"
				className="text-left px-4 py-3 align-top min-w-[12rem] sticky left-0"
				style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
			>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
						{instance.name}
					</span>
					<MonoCaption as="span" className="truncate max-w-[14rem]" title={mask(instance.baseUrl)}>
						{mask(instance.baseUrl.replace(/^https?:\/\//, ""))}
					</MonoCaption>
					{status.kind === "ok" && (
						<span className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
							{foundCount}/{cells.length} grounded
						</span>
					)}
					{status.kind === "loading" && (
						<span className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
							Loading…
						</span>
					)}
					{status.kind === "error" && (
						<span className="text-xs mt-0.5" style={{ color: "#f87171" }} title={status.message}>
							{status.message}
						</span>
					)}
				</div>
			</th>

			{status.kind === "loading"
				? cells.map((cell) => (
						<td key={cell.expected} className="px-3 py-3 align-top min-w-[8rem]">
							<Skeleton className="h-4 w-16" />
						</td>
					))
				: status.kind === "error"
					? cells.map((cell) => (
							<td
								key={cell.expected}
								className="px-3 py-3 align-top min-w-[8rem]"
								style={{ color: "var(--text-4)" }}
							>
								<span className="text-xs">—</span>
							</td>
						))
					: cells.map((cell) => (
							<td key={cell.expected} className="px-3 py-3 align-top min-w-[8rem]">
								{cell.found ? (
									<div className="flex items-start gap-1.5">
										<Check
											className="w-3.5 h-3.5 shrink-0 mt-0.5"
											strokeWidth={2.5}
											style={{ color: "#34d399" }}
										/>
										<span
											className="text-xs break-words"
											style={{ color: "var(--text-2)" }}
											title={cell.value ?? ""}
										>
											{cell.value}
										</span>
									</div>
								) : (
									<X
										className="w-3.5 h-3.5"
										strokeWidth={2}
										style={{ color: "#f87171" }}
										aria-label={`${cell.expected} missing`}
									/>
								)}
							</td>
						))}
		</tr>
	);
}
