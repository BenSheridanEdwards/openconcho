// Permissive prefix: matches "Name:", "EMAIL:", "Preferred address:", "git_hub:"
const FACT_RE = /^([A-Za-z][A-Za-z0-9 _-]*?):\s*(.*)$/;
// ALL-CAPS group label: PeerCardViewer treats these as collapsible sections,
// so a line like "IDENTITY: Name: Ben" carries the real fact under a section
// prefix and we should unwrap it.
const CAPS_LABEL = /^[A-Z][A-Z0-9_]+$/;

export function normalizeFactKey(key: string): string {
	return key.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/**
 * Extract `Key: Value` lines from a peer card into a map of normalized key →
 * value. Keys are lower-cased, hyphens/underscores collapsed to spaces, so
 * "EMAIL", "Email", and "e-mail" all match the same fact. First occurrence
 * wins on duplicates.
 *
 * Also unwraps a single ALL_CAPS group prefix so cards that use Honcho's
 * collapsible-section convention (e.g. "IDENTITY: Name: Ben") still surface
 * "Name" as the matchable key. A bare ALL_CAPS line like "EMAIL: x@y.z" still
 * matches because the second-level prefix doesn't exist and we fall back to
 * the first.
 */
export function extractFacts(lines: string[]): Map<string, string> {
	const facts = new Map<string, string>();
	for (const line of lines) {
		const m = FACT_RE.exec(line);
		if (!m) continue;
		let key = m[1];
		let value = m[2];
		// If the outer key is an ALL_CAPS section label (IDENTITY, ATTRIBUTE,
		// RELATIONSHIP, …) and the value itself is "InnerKey: …", descend once.
		if (CAPS_LABEL.test(key.trim())) {
			const inner = FACT_RE.exec(value);
			if (inner) {
				key = inner[1];
				value = inner[2];
			}
		}
		const normalized = normalizeFactKey(key);
		if (!normalized || facts.has(normalized)) continue;
		facts.set(normalized, value.trim());
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
