import { describe, expect, it } from "vitest";
import { auditFacts, extractFacts, normalizeFactKey } from "@/lib/peerCardFacts";

describe("normalizeFactKey", () => {
	it("lower-cases and collapses separators", () => {
		expect(normalizeFactKey("Email")).toBe("email");
		expect(normalizeFactKey("Preferred address")).toBe("preferred address");
		expect(normalizeFactKey("PREFERRED_ADDRESS")).toBe("preferred address");
		expect(normalizeFactKey("git-hub")).toBe("git hub");
	});
});

describe("extractFacts", () => {
	it("captures Title Case prefix lines", () => {
		const facts = extractFacts(["Name: Ada", "Email: ada@example.com"]);
		expect(facts.get("name")).toBe("Ada");
		expect(facts.get("email")).toBe("ada@example.com");
	});

	it("captures ALL CAPS prefix lines", () => {
		const facts = extractFacts(["NAME: Ada", "EMAIL: ada@example.com"]);
		expect(facts.get("name")).toBe("Ada");
		expect(facts.get("email")).toBe("ada@example.com");
	});

	it("captures multi-word prefixes with spaces or underscores", () => {
		const facts = extractFacts(["Preferred address: Chief", "GIT_HUB: bsedw"]);
		expect(facts.get("preferred address")).toBe("Chief");
		expect(facts.get("git hub")).toBe("bsedw");
	});

	it("ignores lines without a recognizable prefix", () => {
		const facts = extractFacts(["just a fact about Ada", "  : leading colon"]);
		expect(facts.size).toBe(0);
	});

	it("keeps the first occurrence on duplicate keys", () => {
		const facts = extractFacts(["Name: Ada", "Name: Other"]);
		expect(facts.get("name")).toBe("Ada");
	});

	it("unwraps an ALL_CAPS group prefix to find the inner fact", () => {
		// Honcho's PeerCardViewer renders ALL_CAPS prefixes as collapsible
		// section labels; cards in the wild use shapes like:
		//   IDENTITY: Name: Ben Sheridan-Edwards
		//   ATTRIBUTE: Role: Fractional CTO
		const facts = extractFacts([
			"IDENTITY: Name: Ben Sheridan-Edwards",
			"IDENTITY: Email: ben@codewalnut.com",
			"ATTRIBUTE: Role: Fractional CTO",
		]);
		expect(facts.get("name")).toBe("Ben Sheridan-Edwards");
		expect(facts.get("email")).toBe("ben@codewalnut.com");
		expect(facts.get("role")).toBe("Fractional CTO");
	});

	it("falls back to the ALL_CAPS prefix as the key when nothing is nested", () => {
		// "EMAIL: x@y.z" has no inner colon — treat EMAIL itself as the key.
		const facts = extractFacts(["EMAIL: ben@codewalnut.com"]);
		expect(facts.get("email")).toBe("ben@codewalnut.com");
	});
});

describe("auditFacts", () => {
	const lines = ["Name: Ada", "Email: ada@example.com", "Preferred address: Chief"];

	it("returns one cell per expected fact, in order", () => {
		const cells = auditFacts(lines, ["Name", "Email", "GitHub"]);
		expect(cells.map((c) => c.expected)).toEqual(["Name", "Email", "GitHub"]);
	});

	it("matches case-insensitively and returns the value", () => {
		const cells = auditFacts(lines, ["name", "EMAIL"]);
		expect(cells[0]).toEqual({ expected: "name", found: true, value: "Ada" });
		expect(cells[1]).toEqual({ expected: "EMAIL", found: true, value: "ada@example.com" });
	});

	it("marks missing facts as not found", () => {
		const cells = auditFacts(lines, ["GitHub", "LinkedIn"]);
		expect(cells[0]).toEqual({ expected: "GitHub", found: false, value: null });
		expect(cells[1]).toEqual({ expected: "LinkedIn", found: false, value: null });
	});

	it("matches multi-word fact names that vary in case", () => {
		const cells = auditFacts(lines, ["Preferred address"]);
		expect(cells[0]).toEqual({ expected: "Preferred address", found: true, value: "Chief" });
	});

	it("returns all-not-found for an empty card", () => {
		const cells = auditFacts([], ["Name", "Email", "Role"]);
		expect(cells.every((c) => !c.found && c.value === null)).toBe(true);
	});
});
