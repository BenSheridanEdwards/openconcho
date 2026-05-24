import { useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { GitCompare, Info, MinusCircle, PencilLine, PlusCircle } from "lucide-react";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { useAllConclusions } from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Skeleton } from "@/components/shared/Skeleton";
import { TimestampChip } from "@/components/shared/TimestampChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Body, Caption, MonoCaption, Muted, PageTitle } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import type { ModifiedPair } from "@/lib/conclusionDiff";
import { diffConclusions } from "@/lib/conclusionDiff";
import { COLOR } from "@/lib/constants";

type Conclusion = components["schemas"]["Conclusion"];

function parseCreatedAt(value: string): DateTime {
	const dt = DateTime.fromFormat(value, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });
	return dt.isValid ? dt : DateTime.fromISO(value, { zone: "utc" });
}

function toLocalInput(dt: DateTime): string {
	return dt.toLocal().toFormat("yyyy-MM-dd'T'HH:mm");
}

function fromLocalInput(value: string): DateTime | null {
	const dt = DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm", { zone: "local" });
	return dt.isValid ? dt : null;
}

interface ColumnProps {
	title: string;
	color: string;
	dim: string;
	border: string;
	icon: React.ComponentType<{
		className?: string;
		strokeWidth?: number;
		style?: React.CSSProperties;
	}>;
	count: number;
	emptyHint: string;
	children: React.ReactNode;
}

function DiffColumn({
	title,
	color,
	dim,
	border,
	icon: Icon,
	count,
	emptyHint,
	children,
}: ColumnProps) {
	return (
		<section
			className="rounded-xl flex flex-col"
			style={{ background: dim, border: `1px solid ${border}` }}
		>
			<header
				className="flex items-center gap-2 px-4 py-3"
				style={{ borderBottom: `1px solid ${border}` }}
			>
				<Icon className="w-4 h-4" strokeWidth={1.75} style={{ color }} />
				<span className="text-sm font-semibold" style={{ color }}>
					{title}
				</span>
				<span
					className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
					style={{ background: `${color}1f`, color, border: `1px solid ${border}` }}
				>
					{count}
				</span>
			</header>
			<div className="p-3 space-y-2 min-h-[8rem]">
				{count === 0 ? (
					<Caption className="block px-1 py-2" style={{ color: "var(--text-4)" }}>
						{emptyHint}
					</Caption>
				) : (
					children
				)}
			</div>
		</section>
	);
}

interface ConclusionCardProps {
	conclusion: Conclusion;
	accent: string;
	border: string;
	mask: (v: string) => string;
}

function ConclusionCard({ conclusion, accent, border, mask }: ConclusionCardProps) {
	return (
		<div
			className="rounded-lg p-3"
			style={{ background: "var(--surface)", border: `1px solid ${border}` }}
		>
			<div className="flex items-center gap-2 mb-1.5">
				<MonoCaption style={{ color: accent }}>{mask(conclusion.id)}</MonoCaption>
				<span className="ml-auto">
					<TimestampChip value={conclusion.created_at} />
				</span>
			</div>
			<Body className="text-sm leading-snug whitespace-pre-wrap">{conclusion.content}</Body>
			<div className="mt-2 flex flex-wrap gap-1.5">
				<MonoCaption style={{ color: "var(--text-4)" }}>
					observer={mask(conclusion.observer_id)}
				</MonoCaption>
				<MonoCaption style={{ color: "var(--text-4)" }}>
					observed={mask(conclusion.observed_id)}
				</MonoCaption>
			</div>
		</div>
	);
}

function ModifiedCard({ pair, mask }: { pair: ModifiedPair; mask: (v: string) => string }) {
	return (
		<div
			className="rounded-lg p-3"
			style={{ background: "var(--surface)", border: `1px solid ${COLOR.warningBorder}` }}
		>
			<div className="flex items-center gap-2 mb-2">
				<MonoCaption style={{ color: COLOR.warning }}>{mask(pair.after.id)}</MonoCaption>
				<span className="ml-auto">
					<TimestampChip value={pair.after.created_at} />
				</span>
			</div>
			<div className="space-y-1.5">
				<div className="rounded p-2" style={{ background: COLOR.destructiveDim }}>
					<MonoCaption style={{ color: COLOR.destructive }}>before</MonoCaption>
					<Body className="text-sm leading-snug whitespace-pre-wrap">{pair.before.content}</Body>
				</div>
				<div className="rounded p-2" style={{ background: COLOR.successDim }}>
					<MonoCaption style={{ color: COLOR.success }}>after</MonoCaption>
					<Body className="text-sm leading-snug whitespace-pre-wrap">{pair.after.content}</Body>
				</div>
			</div>
		</div>
	);
}

function DiffSkeleton() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
			{[0, 1, 2].map((i) => (
				<div key={i} className="rounded-xl p-3" style={{ border: "1px solid var(--border)" }}>
					<Skeleton className="h-5 w-32 mb-3" />
					<Skeleton className="h-20 w-full mb-2" />
					<Skeleton className="h-20 w-full" />
				</div>
			))}
		</div>
	);
}

export function ConclusionDiffView() {
	const { mask } = useDemo();
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };

	const [observedId, setObservedId] = useState("");
	const [observerId, setObserverId] = useState("");
	const [beforeInput, setBeforeInput] = useState(() =>
		toLocalInput(DateTime.now().minus({ days: 7 })),
	);
	const [afterInput, setAfterInput] = useState(() => toLocalInput(DateTime.now()));

	const filters = useMemo<Record<string, unknown>>(() => {
		const f: Record<string, unknown> = {};
		if (observedId.trim()) f.observed_id = observedId.trim();
		if (observerId.trim()) f.observer_id = observerId.trim();
		return f;
	}, [observedId, observerId]);

	const { data, isLoading, error } = useAllConclusions(workspaceId, filters);

	const conclusions = useMemo<Conclusion[]>(() => (data ?? []) as Conclusion[], [data]);

	const beforeDt = useMemo(() => fromLocalInput(beforeInput), [beforeInput]);
	const afterDt = useMemo(() => fromLocalInput(afterInput), [afterInput]);

	const { diff, validRange } = useMemo(() => {
		if (!beforeDt || !afterDt) {
			return { diff: null, validRange: false };
		}
		const beforeMs = beforeDt.toUTC().toMillis();
		const afterMs = afterDt.toUTC().toMillis();
		const beforeSnap: Conclusion[] = [];
		const afterSnap: Conclusion[] = [];
		for (const c of conclusions) {
			const created = parseCreatedAt(c.created_at).toMillis();
			if (Number.isNaN(created)) continue;
			if (created <= beforeMs) beforeSnap.push(c);
			if (created <= afterMs) afterSnap.push(c);
		}
		return { diff: diffConclusions(beforeSnap, afterSnap), validRange: true };
	}, [conclusions, beforeDt, afterDt]);

	function applyPreset(preset: "last-week" | "last-24h" | "last-hour") {
		const now = DateTime.now();
		setAfterInput(toLocalInput(now));
		if (preset === "last-week") setBeforeInput(toLocalInput(now.minus({ days: 7 })));
		else if (preset === "last-24h") setBeforeInput(toLocalInput(now.minus({ days: 1 })));
		else if (preset === "last-hour") setBeforeInput(toLocalInput(now.minus({ hours: 1 })));
	}

	const showInvalid = beforeDt && afterDt && beforeDt > afterDt;

	return (
		<div className="page-container page-container--wide">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<Breadcrumb />
				<div className="flex items-center gap-2 mb-1">
					<GitCompare className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<PageTitle>Conclusion Diff</PageTitle>
				</div>
				<Muted className="mt-0.5">
					Compare a peer's conclusions between two points in time — useful for benchmarking dreamer
					model runs on the same observation set.
				</Muted>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.05 }}
				className="rounded-xl p-4 mb-6 theme-card"
			>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
					<div>
						<Label htmlFor="observed-id">Observed peer (optional)</Label>
						<Input
							id="observed-id"
							value={observedId}
							onChange={(e) => setObservedId(e.target.value)}
							placeholder="peer id"
							className="font-mono"
						/>
					</div>
					<div>
						<Label htmlFor="observer-id">Observer peer (optional)</Label>
						<Input
							id="observer-id"
							value={observerId}
							onChange={(e) => setObserverId(e.target.value)}
							placeholder="peer id"
							className="font-mono"
						/>
					</div>
					<div>
						<Label htmlFor="before-ts">Before</Label>
						<Input
							id="before-ts"
							type="datetime-local"
							value={beforeInput}
							onChange={(e) => setBeforeInput(e.target.value)}
							className="font-mono"
						/>
					</div>
					<div>
						<Label htmlFor="after-ts">After</Label>
						<Input
							id="after-ts"
							type="datetime-local"
							value={afterInput}
							onChange={(e) => setAfterInput(e.target.value)}
							className="font-mono"
						/>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Caption style={{ color: "var(--text-4)" }}>Presets:</Caption>
					<Button variant="surface" size="sm" onClick={() => applyPreset("last-hour")}>
						Last hour
					</Button>
					<Button variant="surface" size="sm" onClick={() => applyPreset("last-24h")}>
						Last 24h
					</Button>
					<Button variant="surface" size="sm" onClick={() => applyPreset("last-week")}>
						Last week
					</Button>
				</div>
				{showInvalid && (
					<div
						className="mt-3 rounded-md px-3 py-2 text-xs"
						style={{
							background: COLOR.warningDim,
							border: `1px solid ${COLOR.warningBorder}`,
							color: COLOR.warning,
						}}
					>
						"Before" is after "After" — swap them or adjust the dates.
					</div>
				)}
			</motion.div>

			<ErrorAlert error={error instanceof Error ? error : null} />

			{isLoading && <DiffSkeleton />}

			{!isLoading && validRange && diff && conclusions.length === 0 && (
				<EmptyState
					icon={GitCompare}
					title="No conclusions found"
					description={
						Object.keys(filters).length === 0
							? "This workspace has no conclusions yet."
							: "No conclusions match the selected peer filter."
					}
				/>
			)}

			{!isLoading && validRange && diff && conclusions.length > 0 && (
				<>
					<motion.div
						className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.1 }}
					>
						<DiffColumn
							title="Added"
							color={COLOR.success}
							dim={COLOR.successDim}
							border={COLOR.successBorder}
							icon={PlusCircle}
							count={diff.added.length}
							emptyHint="No conclusions added in this window."
						>
							{diff.added.map((c) => (
								<ConclusionCard
									key={c.id}
									conclusion={c}
									accent={COLOR.success}
									border={COLOR.successBorder}
									mask={mask}
								/>
							))}
						</DiffColumn>

						<DiffColumn
							title="Modified"
							color={COLOR.warning}
							dim={COLOR.warningDim}
							border={COLOR.warningBorder}
							icon={PencilLine}
							count={diff.modified.length}
							emptyHint="No conclusions changed content. (Requires content history — see note below.)"
						>
							{diff.modified.map((pair) => (
								<ModifiedCard key={pair.after.id} pair={pair} mask={mask} />
							))}
						</DiffColumn>

						<DiffColumn
							title="Removed / merged"
							color={COLOR.destructive}
							dim={COLOR.destructiveDim}
							border={COLOR.destructiveBorder}
							icon={MinusCircle}
							count={diff.removed.length}
							emptyHint="No conclusions removed. (Requires audit history — see note below.)"
						>
							{diff.removed.map((c) => {
								const merge = diff.mergeCandidates.find((m) => m.removed.id === c.id);
								return (
									<div key={c.id} className="space-y-1.5">
										<ConclusionCard
											conclusion={c}
											accent={COLOR.destructive}
											border={COLOR.destructiveBorder}
											mask={mask}
										/>
										{merge && (
											<div
												className="rounded p-2 text-xs flex gap-2 items-start"
												style={{
													background: COLOR.warningDim,
													border: `1px solid ${COLOR.warningBorder}`,
												}}
											>
												<Info
													className="w-3.5 h-3.5 mt-0.5 shrink-0"
													strokeWidth={1.75}
													style={{ color: COLOR.warning }}
												/>
												<span style={{ color: COLOR.warning }}>
													Possibly merged into{" "}
													<span className="font-mono">{mask(merge.candidate.id)}</span> — first 50
													characters match.
												</span>
											</div>
										)}
									</div>
								);
							})}
						</DiffColumn>
					</motion.div>

					<div
						className="rounded-md px-3 py-2 text-xs flex gap-2 items-start"
						style={{
							background: "var(--bg-3)",
							border: "1px solid var(--border)",
							color: "var(--text-3)",
						}}
					>
						<Info
							className="w-3.5 h-3.5 mt-0.5 shrink-0"
							strokeWidth={1.75}
							style={{ color: "var(--text-4)" }}
						/>
						<span>
							Snapshots are derived from the current conclusions list, bucketed by{" "}
							<span className="font-mono">created_at</span>. Modified and Removed columns will be
							populated when the API exposes per-conclusion content history or an audit log.
						</span>
					</div>
				</>
			)}
		</div>
	);
}
