import { useNavigate, useSearch } from "@tanstack/react-router";
import { Columns2, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Body, Caption, PageTitle } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import type { Instance } from "@/lib/config";
import { CompareColumn } from "./CompareColumn";

interface CompareSearch {
	instances?: string;
	peer?: string;
}

export function CompareView() {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as CompareSearch;
	const { instances } = useInstances();

	const selectedIds = useMemo(() => {
		if (!search.instances) return [];
		return search.instances.split(",").filter(Boolean);
	}, [search.instances]);

	const selected: Instance[] = useMemo(() => {
		const lookup = new Map(instances.map((i) => [i.id, i] as const));
		return selectedIds.map((id) => lookup.get(id)).filter((i): i is Instance => i !== undefined);
	}, [selectedIds, instances]);

	const available = useMemo(
		() => instances.filter((i) => !selectedIds.includes(i.id)),
		[instances, selectedIds],
	);

	const [pickerOpen, setPickerOpen] = useState(false);
	const pickerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!pickerOpen) return;
		function onClick(e: MouseEvent) {
			if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
		}
		window.addEventListener("mousedown", onClick);
		return () => window.removeEventListener("mousedown", onClick);
	}, [pickerOpen]);

	function setInstancesSearch(ids: string[]) {
		navigate({
			to: "/compare" as never,
			search: { ...search, instances: ids.length > 0 ? ids.join(",") : undefined } as never,
		});
	}

	function addInstance(id: string) {
		setInstancesSearch([...selectedIds, id]);
		setPickerOpen(false);
	}

	function removeInstance(id: string) {
		setInstancesSearch(selectedIds.filter((sid) => sid !== id));
	}

	function setTargetPeer(peer: string) {
		navigate({
			to: "/compare" as never,
			search: { ...search, peer: peer || undefined } as never,
		});
	}

	if (instances.length === 0) {
		return (
			<div className="page-container">
				<PageTitle>Compare</PageTitle>
				<Body className="mt-2">
					Configure at least two Honcho instances in Settings before using compare.
				</Body>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div
				className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<div>
					<PageTitle>Compare</PageTitle>
					<Caption as="p" className="mt-0.5">
						Side-by-side view of peer representations across instances
					</Caption>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<label
						className="text-xs font-medium flex items-center gap-2"
						style={{ color: "var(--text-3)" }}
					>
						Target peer
						<input
							type="text"
							value={search.peer ?? ""}
							onChange={(e) => setTargetPeer(e.target.value)}
							placeholder="ben"
							className="px-2 py-1 text-sm rounded-md font-mono"
							style={{
								background: "var(--bg-2)",
								border: "1px solid var(--border)",
								color: "var(--text-2)",
								width: "12rem",
							}}
						/>
					</label>

					<div ref={pickerRef} className="relative">
						<button
							type="button"
							onClick={() => setPickerOpen((v) => !v)}
							disabled={available.length === 0}
							className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors"
							style={{
								background: "var(--accent-dim)",
								border: "1px solid var(--accent-border)",
								color: "var(--accent-text)",
								opacity: available.length === 0 ? 0.5 : 1,
								cursor: available.length === 0 ? "not-allowed" : "pointer",
							}}
						>
							<Plus className="w-4 h-4" strokeWidth={2} />
							Add instance
						</button>
						{pickerOpen && available.length > 0 && (
							<div
								className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-20 min-w-[14rem]"
								style={{
									background: "var(--bg-2)",
									border: "1px solid var(--border)",
									boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
								}}
							>
								{available.map((inst) => (
									<button
										key={inst.id}
										type="button"
										onClick={() => addInstance(inst.id)}
										className="w-full flex flex-col items-start px-3 py-2 text-left transition-colors hover:opacity-80"
										style={{ background: "transparent" }}
									>
										<span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
											{inst.name}
										</span>
										<span
											className="text-xs font-mono truncate w-full"
											style={{ color: "var(--text-4)" }}
										>
											{inst.baseUrl.replace(/^https?:\/\//, "")}
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{selected.length === 0 ? (
				<div className="flex-1 flex items-center justify-center">
					<EmptyState
						icon={Columns2}
						title="Pick instances to compare"
						description="Add two or more configured Honcho instances to see their peer representations side by side."
					/>
				</div>
			) : (
				<div
					className="flex-1 grid gap-3 px-6 py-4 overflow-x-auto"
					style={{
						gridTemplateColumns: `repeat(${selected.length}, minmax(20rem, 1fr))`,
					}}
				>
					{selected.map((inst) => (
						<CompareColumn
							key={inst.id}
							instance={inst}
							targetPeerName={search.peer || undefined}
							onRemove={() => removeInstance(inst.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
