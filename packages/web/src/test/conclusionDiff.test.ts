import { describe, expect, it } from "vitest";
import type { components } from "@/api/schema.d.ts";
import { diffConclusions } from "@/lib/conclusionDiff";

type Conclusion = components["schemas"]["Conclusion"];

function mkConclusion(
	id: string,
	content: string,
	overrides: Partial<Conclusion> = {},
): Conclusion {
	return {
		id,
		content,
		observer_id: overrides.observer_id ?? "obs-1",
		observed_id: overrides.observed_id ?? "tgt-1",
		session_id: overrides.session_id ?? null,
		created_at: overrides.created_at ?? "2026-05-20 12:00:00",
	};
}

describe("diffConclusions — set diff", () => {
	it("classifies items only in 'after' as added", () => {
		const before = [mkConclusion("a", "alpha")];
		const after = [
			mkConclusion("a", "alpha"),
			mkConclusion("b", "beta"),
			mkConclusion("c", "gamma"),
		];

		const diff = diffConclusions(before, after);

		expect(diff.added.map((c) => c.id)).toEqual(["b", "c"]);
		expect(diff.removed).toEqual([]);
		expect(diff.modified).toEqual([]);
	});

	it("classifies items only in 'before' as removed", () => {
		const before = [mkConclusion("a", "alpha"), mkConclusion("b", "beta")];
		const after = [mkConclusion("a", "alpha")];

		const diff = diffConclusions(before, after);

		expect(diff.removed.map((c) => c.id)).toEqual(["b"]);
		expect(diff.added).toEqual([]);
		expect(diff.modified).toEqual([]);
	});

	it("ignores items present in both with identical content", () => {
		const shared = mkConclusion("a", "alpha");
		const diff = diffConclusions([shared], [shared]);

		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
		expect(diff.modified).toEqual([]);
	});

	it("returns empty diff when both snapshots are empty", () => {
		const diff = diffConclusions([], []);
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
		expect(diff.modified).toEqual([]);
		expect(diff.mergeCandidates).toEqual([]);
	});
});

describe("diffConclusions — modified detection", () => {
	it("detects same id with different content as modified", () => {
		const before = [mkConclusion("a", "alpha v1")];
		const after = [mkConclusion("a", "alpha v2")];

		const diff = diffConclusions(before, after);

		expect(diff.modified).toHaveLength(1);
		expect(diff.modified[0].before.content).toBe("alpha v1");
		expect(diff.modified[0].after.content).toBe("alpha v2");
		expect(diff.added).toEqual([]);
		expect(diff.removed).toEqual([]);
	});

	it("does not flag identical content as modified", () => {
		const before = [mkConclusion("a", "alpha")];
		const after = [mkConclusion("a", "alpha")];

		const diff = diffConclusions(before, after);

		expect(diff.modified).toEqual([]);
	});

	it("handles mixed added / removed / modified in one diff", () => {
		const before = [
			mkConclusion("a", "alpha v1"),
			mkConclusion("b", "beta"),
			mkConclusion("c", "gamma"),
		];
		const after = [
			mkConclusion("a", "alpha v2"),
			mkConclusion("c", "gamma"),
			mkConclusion("d", "delta"),
		];

		const diff = diffConclusions(before, after);

		expect(diff.added.map((c) => c.id)).toEqual(["d"]);
		expect(diff.removed.map((c) => c.id)).toEqual(["b"]);
		expect(diff.modified).toHaveLength(1);
		expect(diff.modified[0].before.id).toBe("a");
	});
});

describe("diffConclusions — fuzzy merge candidates", () => {
	it("flags a removed item whose first 50 chars match an added item", () => {
		const before = [
			mkConclusion("old", "User strongly prefers concise, terse answers without preamble."),
		];
		const after = [
			mkConclusion(
				"new",
				"User strongly prefers concise, terse answers without preamble — confirmed across sessions.",
			),
		];

		const diff = diffConclusions(before, after);

		expect(diff.removed.map((c) => c.id)).toEqual(["old"]);
		expect(diff.added.map((c) => c.id)).toEqual(["new"]);
		expect(diff.mergeCandidates).toHaveLength(1);
		expect(diff.mergeCandidates[0].removed.id).toBe("old");
		expect(diff.mergeCandidates[0].candidate.id).toBe("new");
	});

	it("does not flag unrelated added/removed pairs", () => {
		const before = [mkConclusion("old", "user likes dogs")];
		const after = [mkConclusion("new", "completely different topic about gardening")];

		const diff = diffConclusions(before, after);

		expect(diff.mergeCandidates).toEqual([]);
	});

	it("is case-insensitive on the prefix match", () => {
		const before = [
			mkConclusion("old", "USER STRONGLY PREFERS CONCISE TERSE ANSWERS WITHOUT preamble"),
		];
		const after = [
			mkConclusion(
				"new",
				"user strongly prefers concise terse answers without PREAMBLE — confirmed",
			),
		];

		const diff = diffConclusions(before, after);

		expect(diff.mergeCandidates).toHaveLength(1);
	});
});
