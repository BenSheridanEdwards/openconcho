import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	useScopedPeerCard,
	useScopedPeerRepresentation,
	useScopedPeers,
	useScopedWorkspaces,
} from "@/api/compareQueries";
import type { components } from "@/api/schema.d.ts";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { PeerCardViewer } from "@/components/shared/PeerCardViewer";
import { Skeleton } from "@/components/shared/Skeleton";
import { Caption, MonoCaption, SectionHeading } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import type { Instance } from "@/lib/config";

type Workspace = components["schemas"]["Workspace"];
type Peer = components["schemas"]["Peer"];
type Conclusion = components["schemas"]["Conclusion"];

interface Props {
	instance: Instance;
	targetPeerName: string | undefined;
	onRemove: () => void;
}

export function CompareColumn({ instance, targetPeerName, onRemove }: Props) {
	const { mask } = useDemo();
	const [workspaceId, setWorkspaceId] = useState<string>("");
	const [peerId, setPeerId] = useState<string>("");

	const workspacesQuery = useScopedWorkspaces(instance);
	const peersQuery = useScopedPeers(instance, workspaceId);
	const representation = useScopedPeerRepresentation(instance, workspaceId, peerId);
	const card = useScopedPeerCard(instance, workspaceId, peerId);

	const workspaces: Workspace[] = useMemo(
		() => (workspacesQuery.data as { items?: Workspace[] } | undefined)?.items ?? [],
		[workspacesQuery.data],
	);
	const peers: Peer[] = useMemo(
		() => (peersQuery.data as { items?: Peer[] } | undefined)?.items ?? [],
		[peersQuery.data],
	);

	// Auto-select first workspace once loaded.
	useEffect(() => {
		if (workspaces.length > 0 && !workspaceId) {
			setWorkspaceId(workspaces[0].id);
		}
	}, [workspaces, workspaceId]);

	// Auto-select peer: prefer the target name if it exists in this instance,
	// otherwise fall back to the first peer.
	useEffect(() => {
		if (peers.length === 0) return;
		if (targetPeerName) {
			const match = peers.find((p) => p.id === targetPeerName);
			if (match && match.id !== peerId) {
				setPeerId(match.id);
				return;
			}
			if (match) return;
		}
		if (!peerId) setPeerId(peers[0].id);
	}, [peers, targetPeerName, peerId]);

	const cardLines: string[] = useMemo(() => {
		const raw = (card.data as { peer_card?: unknown } | undefined)?.peer_card;
		if (Array.isArray(raw)) return raw as string[];
		if (typeof raw === "string") return [raw];
		return [];
	}, [card.data]);

	const conclusions: Conclusion[] = useMemo(() => {
		const raw = (representation.data as { conclusions?: Conclusion[] } | undefined)?.conclusions;
		return Array.isArray(raw) ? raw : [];
	}, [representation.data]);

	return (
		<div
			className="flex flex-col h-full rounded-lg overflow-hidden min-w-0"
			style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
		>
			<header
				className="px-4 py-3 flex items-center justify-between gap-2"
				style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}
			>
				<div className="min-w-0 flex-1">
					<p
						className="text-sm font-medium truncate"
						style={{ color: "var(--text-1)" }}
						title={instance.name}
					>
						{instance.name}
					</p>
					<MonoCaption as="p" className="truncate" title={mask(instance.baseUrl)}>
						{mask(instance.baseUrl.replace(/^https?:\/\//, ""))}
					</MonoCaption>
				</div>
				<button
					type="button"
					onClick={onRemove}
					className="w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 hover:opacity-80"
					style={{ color: "var(--text-3)", background: "transparent" }}
					title="Remove from compare"
					aria-label={`Remove ${instance.name} from comparison`}
				>
					<X className="w-4 h-4" strokeWidth={1.5} />
				</button>
			</header>

			<div className="px-4 py-3 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
				<label className="block text-xs font-medium" style={{ color: "var(--text-3)" }}>
					Workspace
					<select
						value={workspaceId}
						onChange={(e) => {
							setWorkspaceId(e.target.value);
							setPeerId("");
						}}
						className="mt-1 w-full px-2 py-1.5 text-sm rounded-md font-mono"
						style={{
							background: "var(--bg-2)",
							border: "1px solid var(--border)",
							color: "var(--text-2)",
						}}
					>
						{workspacesQuery.isLoading && <option>Loading…</option>}
						{!workspacesQuery.isLoading && workspaces.length === 0 && (
							<option value="">No workspaces</option>
						)}
						{workspaces.map((ws) => (
							<option key={ws.id} value={ws.id}>
								{mask(ws.id)}
							</option>
						))}
					</select>
				</label>

				<label className="block text-xs font-medium" style={{ color: "var(--text-3)" }}>
					Peer
					<select
						value={peerId}
						onChange={(e) => setPeerId(e.target.value)}
						className="mt-1 w-full px-2 py-1.5 text-sm rounded-md font-mono"
						style={{
							background: "var(--bg-2)",
							border: "1px solid var(--border)",
							color: "var(--text-2)",
						}}
						disabled={!workspaceId}
					>
						{peersQuery.isLoading && <option>Loading…</option>}
						{!peersQuery.isLoading && peers.length === 0 && <option value="">No peers</option>}
						{peers.map((p) => (
							<option key={p.id} value={p.id}>
								{mask(p.id)}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
				{workspacesQuery.error && <ErrorAlert error={workspacesQuery.error} />}

				{peerId && (
					<>
						<section>
							<SectionHeading className="mb-2">Conclusions</SectionHeading>
							{representation.isLoading && <Skeleton className="h-24" />}
							{!representation.isLoading && conclusions.length === 0 && (
								<Caption>No conclusions yet for this peer.</Caption>
							)}
							{conclusions.length > 0 && (
								<ul className="space-y-1.5">
									{conclusions.map((c, i) => (
										<li
											key={`${i}-${c.content.slice(0, 32)}`}
											className="text-sm leading-relaxed px-3 py-2 rounded-md break-words"
											style={{
												background: "var(--bg-2)",
												border: "1px solid var(--border)",
												color: "var(--text-2)",
											}}
										>
											{c.content}
										</li>
									))}
								</ul>
							)}
							{conclusions.length > 0 && (
								<Caption className="mt-2 block">
									{conclusions.length} {conclusions.length === 1 ? "conclusion" : "conclusions"}
								</Caption>
							)}
						</section>

						<section>
							<SectionHeading className="mb-2">Peer card</SectionHeading>
							{card.isLoading && <Skeleton className="h-32" />}
							{!card.isLoading && <PeerCardViewer lines={cardLines} />}
						</section>
					</>
				)}
			</div>
		</div>
	);
}
