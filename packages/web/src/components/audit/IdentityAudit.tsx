import { useNavigate, useSearch } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Body, Caption, PageTitle } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import { AuditRow } from "./AuditRow";

const FACTS_KEY = "openconcho:audit-facts";
const DEFAULT_FACTS = [
	"Name",
	"Email",
	"Preferred address",
	"Role",
	"GitHub",
	"LinkedIn",
	"Employer",
];
const DEFAULT_PEER = "user";

interface AuditSearch {
	peer?: string;
}

function loadFacts(): string[] {
	try {
		const raw = localStorage.getItem(FACTS_KEY);
		if (!raw) return DEFAULT_FACTS;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
			return parsed.filter((s) => s.trim().length > 0);
		}
	} catch {
		// fall through
	}
	return DEFAULT_FACTS;
}

function saveFacts(facts: string[]): void {
	localStorage.setItem(FACTS_KEY, JSON.stringify(facts));
}

export function IdentityAudit() {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as AuditSearch;
	const { instances } = useInstances();

	const peerName = (search.peer ?? DEFAULT_PEER).trim() || DEFAULT_PEER;

	const [facts, setFacts] = useState<string[]>(() => loadFacts());
	const [draft, setDraft] = useState("");

	useEffect(() => {
		saveFacts(facts);
	}, [facts]);

	const setPeerSearch = useCallback(
		(peer: string) => {
			navigate({
				to: "/audit" as never,
				search: { ...search, peer: peer || undefined } as never,
			});
		},
		[navigate, search],
	);

	const addFact = useCallback(() => {
		const v = draft.trim();
		if (!v) return;
		setFacts((prev) =>
			prev.some((f) => f.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v],
		);
		setDraft("");
	}, [draft]);

	const removeFact = useCallback((fact: string) => {
		setFacts((prev) => prev.filter((f) => f !== fact));
	}, []);

	const resetFacts = useCallback(() => {
		setFacts(DEFAULT_FACTS);
	}, []);

	const sortedInstances = useMemo(
		() => [...instances].sort((a, b) => a.name.localeCompare(b.name)),
		[instances],
	);

	if (instances.length === 0) {
		return (
			<div className="page-container">
				<PageTitle>Identity audit</PageTitle>
				<Body className="mt-2">
					Configure at least one Honcho instance in Settings to run an identity audit.
				</Body>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div
				className="px-6 py-4 flex flex-col gap-3"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<div className="flex items-start justify-between gap-4 flex-wrap">
					<div>
						<PageTitle>Identity audit</PageTitle>
						<Caption as="p" className="mt-0.5">
							Which expected facts are grounded on each agent's peer card for{" "}
							<span className="font-mono">{peerName}</span>.
						</Caption>
					</div>
					<label
						className="text-xs font-medium flex items-center gap-2"
						style={{ color: "var(--text-3)" }}
					>
						Target peer
						<input
							type="text"
							value={search.peer ?? ""}
							onChange={(e) => setPeerSearch(e.target.value)}
							placeholder={DEFAULT_PEER}
							className="px-2 py-1 text-sm rounded-md font-mono"
							style={{
								background: "var(--bg-2)",
								border: "1px solid var(--border)",
								color: "var(--text-2)",
								width: "12rem",
							}}
						/>
					</label>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
						Expected facts
					</span>
					{facts.map((fact) => (
						<span
							key={fact}
							className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md"
							style={{
								background: "var(--accent-dim)",
								color: "var(--accent-text)",
								border: "1px solid var(--accent-border)",
							}}
						>
							{fact}
							<button
								type="button"
								onClick={() => removeFact(fact)}
								className="opacity-70 hover:opacity-100"
								aria-label={`Remove ${fact}`}
							>
								<X className="w-3 h-3" strokeWidth={2} />
							</button>
						</span>
					))}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							addFact();
						}}
						className="flex items-center gap-1"
					>
						<input
							type="text"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="Add fact…"
							className="px-2 py-0.5 text-xs rounded-md font-mono"
							style={{
								background: "var(--bg-2)",
								border: "1px solid var(--border)",
								color: "var(--text-2)",
								width: "8rem",
							}}
						/>
						<button
							type="submit"
							disabled={!draft.trim()}
							className="px-2 py-0.5 text-xs rounded-md"
							style={{
								background: "var(--bg-2)",
								border: "1px solid var(--border)",
								color: "var(--text-2)",
								opacity: draft.trim() ? 1 : 0.5,
							}}
						>
							Add
						</button>
					</form>
					{JSON.stringify(facts) !== JSON.stringify(DEFAULT_FACTS) && (
						<button
							type="button"
							onClick={resetFacts}
							className="px-2 py-0.5 text-xs rounded-md ml-1"
							style={{
								background: "transparent",
								border: "1px solid var(--border)",
								color: "var(--text-3)",
							}}
						>
							Reset defaults
						</button>
					)}
				</div>
			</div>

			{facts.length === 0 ? (
				<div className="flex-1 flex items-center justify-center">
					<EmptyState
						icon={ShieldCheck}
						title="No expected facts configured"
						description="Add at least one fact above to start auditing."
					/>
				</div>
			) : (
				<div className="flex-1 overflow-auto px-6 py-4">
					<table
						className="border-collapse w-full"
						style={{ borderRadius: "0.5rem", overflow: "hidden" }}
					>
						<thead>
							<tr style={{ background: "var(--bg-2)" }}>
								<th
									scope="col"
									className="text-left px-4 py-2.5 text-xs font-medium sticky left-0 z-10"
									style={{
										color: "var(--text-3)",
										background: "var(--bg-2)",
										borderRight: "1px solid var(--border)",
										minWidth: "12rem",
									}}
								>
									Agent
								</th>
								{facts.map((fact) => (
									<th
										key={fact}
										scope="col"
										className="text-left px-3 py-2.5 text-xs font-medium"
										style={{ color: "var(--text-3)", minWidth: "8rem" }}
									>
										{fact}
									</th>
								))}
							</tr>
						</thead>
						<tbody style={{ background: "var(--surface)" }}>
							{sortedInstances.map((inst) => (
								<AuditRow key={inst.id} instance={inst} peerName={peerName} expectedFacts={facts} />
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
