import type { components } from "@/api/schema.d.ts";

type Conclusion = components["schemas"]["Conclusion"];

export interface ModifiedPair {
	before: Conclusion;
	after: Conclusion;
}

export interface MergeCandidate {
	removed: Conclusion;
	candidate: Conclusion;
}

export interface ConclusionDiff {
	added: Conclusion[];
	removed: Conclusion[];
	modified: ModifiedPair[];
	mergeCandidates: MergeCandidate[];
}

const FUZZY_PREFIX_LENGTH = 50;

function normalizePrefix(text: string): string {
	return text.trim().slice(0, FUZZY_PREFIX_LENGTH).toLowerCase();
}

export function diffConclusions(before: Conclusion[], after: Conclusion[]): ConclusionDiff {
	const beforeById = new Map(before.map((c) => [c.id, c]));
	const afterById = new Map(after.map((c) => [c.id, c]));

	const added: Conclusion[] = [];
	const removed: Conclusion[] = [];
	const modified: ModifiedPair[] = [];

	for (const c of after) {
		const prev = beforeById.get(c.id);
		if (!prev) {
			added.push(c);
		} else if (prev.content !== c.content) {
			modified.push({ before: prev, after: c });
		}
	}

	for (const c of before) {
		if (!afterById.has(c.id)) {
			removed.push(c);
		}
	}

	const mergeCandidates: MergeCandidate[] = [];
	if (removed.length > 0 && added.length > 0) {
		const addedPrefixes = added.map((c) => ({
			conclusion: c,
			prefix: normalizePrefix(c.content),
		}));
		for (const r of removed) {
			const rPrefix = normalizePrefix(r.content);
			if (!rPrefix) continue;
			for (const a of addedPrefixes) {
				if (a.prefix && a.prefix === rPrefix) {
					mergeCandidates.push({ removed: r, candidate: a.conclusion });
					break;
				}
			}
		}
	}

	return { added, removed, modified, mergeCandidates };
}
