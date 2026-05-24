// Permissive prefix: matches "Name:", "EMAIL:", "Preferred address:", "git_hub:"
const FACT_RE = /^([A-Za-z][A-Za-z0-9 _-]*?):\s*(.*)$/;

export function normalizeFactKey(key: string): string {
	return key.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/**
 * Extract `Key: Value` lines from a peer card into a map of normalized key →
 * value. Keys are lower-cased, hyphens/underscores collapsed to spaces, so
 * "EMAIL", "Email", and "e-mail" all match the same fact. First occurrence
 * wins on duplicates.
 */
export function extractFacts(lines: string[]): Map<string, string> {
	const facts = new Map<string, string>();
	for (const line of lines) {
		const m = FACT_RE.exec(line);
		if (!m) continue;
		const key = normalizeFactKey(m[1]);
		if (!key || facts.has(key)) continue;
		facts.set(key, m[2].trim());
	}
	return facts;
}

export interface AuditCell {
	expected: string;
	found: boolean;
	value: string | null;
}

/**
 * For each expected fact name, look up its value in the parsed card. Returns
 * one cell per expected fact in the same order, with `found: false` and
 * `value: null` for missing facts.
 */
export function auditFacts(lines: string[], expected: string[]): AuditCell[] {
	const facts = extractFacts(lines);
	return expected.map((name) => {
		const key = normalizeFactKey(name);
		const value = key ? (facts.get(key) ?? null) : null;
		return { expected: name, found: value !== null, value };
	});
}
