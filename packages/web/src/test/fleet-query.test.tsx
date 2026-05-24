import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

// Per-baseUrl fixtures — one workspace each, distinct conclusion sets so we
// can tell the responses apart by content.
const RESPONSES: Record<
	string,
	{ workspaces: unknown; conclusions: Array<{ id: string; content: string }> }
> = {
	"http://localhost:8001": {
		workspaces: { items: [{ id: "neo-personal" }], total: 1, page: 1, size: 1, pages: 1 },
		conclusions: [
			{ id: "n1", content: "Neo knows: Ben works on CodeWalnut" },
			{ id: "n2", content: "Neo knows: Ben likes Honcho" },
		],
	},
	"http://localhost:8002": {
		workspaces: { items: [{ id: "iris-personal" }], total: 1, page: 1, size: 1, pages: 1 },
		conclusions: [
			{ id: "i1", content: "Iris knows: Ben drinks espresso" },
			{ id: "i2", content: "Iris knows: Ben is the Chief" },
			{ id: "i3", content: "Iris knows: Ben uses Macs" },
		],
	},
	"http://localhost:8003": {
		workspaces: { items: [{ id: "lexi-personal" }], total: 1, page: 1, size: 1, pages: 1 },
		conclusions: [{ id: "l1", content: "Lexi knows: Ben writes haikus" }],
	},
};

vi.mock("@/lib/http", () => ({
	httpFetch: vi.fn(async (input: Request | string) => {
		const req = input instanceof Request ? input : new Request(input);
		const url = new URL(req.url);
		const baseUrl = `${url.protocol}//${url.host}`;
		const fixture = RESPONSES[baseUrl];
		if (!fixture) {
			return new Response("{}", { status: 200 });
		}
		if (url.pathname.endsWith("/v3/workspaces/list")) {
			return new Response(JSON.stringify(fixture.workspaces), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}
		if (url.pathname.endsWith("/conclusions/query")) {
			// Mirror Honcho's contract: require filters.observer_id + filters.observed_id.
			let requestBody: { filters?: { observer_id?: string; observed_id?: string } } = {};
			try {
				requestBody = (await req.json()) as typeof requestBody;
			} catch {
				// no body
			}
			const observed = requestBody.filters?.observed_id;
			const observer = requestBody.filters?.observer_id;
			if (!observer || !observed) {
				return new Response(
					JSON.stringify({ detail: "observer and observed must be specified for semantic search" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}
			const body = fixture.conclusions.map((c) => ({
				...c,
				observer_id: observer,
				observed_id: observed,
				created_at: "2026-01-01T00:00:00",
			}));
			return new Response(JSON.stringify(body), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}
		return new Response("{}", { status: 200 });
	}),
}));

function renderAt(initialPath: string) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={qc}>
			<DemoProvider>
				<MetadataProvider>
					{/* biome-ignore lint/suspicious/noExplicitAny: test router type */}
					<RouterProvider router={router as any} />
				</MetadataProvider>
			</DemoProvider>
		</QueryClientProvider>,
	);
}

const NEO = { id: "neo", name: "Neo", baseUrl: "http://localhost:8001", token: "" };
const IRIS = { id: "iris", name: "Iris", baseUrl: "http://localhost:8002", token: "" };
const LEXI = { id: "lexi", name: "Lexi", baseUrl: "http://localhost:8003", token: "" };

describe("Fleet query route", () => {
	beforeEach(async () => {
		const { httpFetch } = await import("@/lib/http");
		(httpFetch as ReturnType<typeof vi.fn>).mockClear();
	});

	// Note: the "no instances configured" branch of FleetQueryView is reachable
	// from real navigation, but the root route's `beforeLoad` redirects any
	// no-config visit to /settings before the fleet-query component mounts,
	// so a route-level test of that empty state isn't meaningful here.

	it("fans out the query to every selected instance's baseUrl", async () => {
		saveStore({ instances: [NEO, IRIS, LEXI], activeId: "neo" });

		const { httpFetch } = await import("@/lib/http");
		renderAt("/fleet-query?q=ben&peer=ben");

		await waitFor(() => {
			const calls = (httpFetch as ReturnType<typeof vi.fn>).mock.calls.map(
				([input]) => (input instanceof Request ? input.url : String(input)) as string,
			);
			const queryHits = calls.filter((u) => u.includes("/conclusions/query"));
			const baseUrls = new Set(queryHits.map((u) => new URL(u).host));
			expect(baseUrls.has("localhost:8001")).toBe(true);
			expect(baseUrls.has("localhost:8002")).toBe(true);
			expect(baseUrls.has("localhost:8003")).toBe(true);
		});
	});

	it("only queries instances that are still selected via the URL", async () => {
		saveStore({ instances: [NEO, IRIS, LEXI], activeId: "neo" });

		const { httpFetch } = await import("@/lib/http");
		renderAt("/fleet-query?q=ben&peer=ben&instances=neo,iris");

		await waitFor(() => {
			const queryHits = (httpFetch as ReturnType<typeof vi.fn>).mock.calls
				.map(([input]) => (input instanceof Request ? input.url : String(input)) as string)
				.filter((u) => u.includes("/conclusions/query"));
			const baseUrls = new Set(queryHits.map((u) => new URL(u).host));
			expect(baseUrls.has("localhost:8001")).toBe(true);
			expect(baseUrls.has("localhost:8002")).toBe(true);
			expect(baseUrls.has("localhost:8003")).toBe(false);
		});
	});

	it("merged view sorts globally by score and tags each row with its instance", async () => {
		saveStore({ instances: [NEO, IRIS, LEXI], activeId: "neo" });

		renderAt("/fleet-query?q=ben&peer=ben&view=merged");

		// All eight conclusions should render (2 + 3 + 1 = 6 unique items across 3 instances)
		await waitFor(() => {
			expect(screen.getByText(/Ben works on CodeWalnut/)).toBeInTheDocument();
			expect(screen.getByText(/Ben is the Chief/)).toBeInTheDocument();
			expect(screen.getByText(/Ben writes haikus/)).toBeInTheDocument();
		});

		// Instance attribution: each merged row should show an instance tag chip.
		// The Neo / Iris / Lexi labels appear inside the result list (instance tags),
		// at least once each.
		const rows = await screen.findAllByRole("listitem");
		const text = rows.map((r) => r.textContent ?? "").join("\n");
		expect(text).toMatch(/Neo/);
		expect(text).toMatch(/Iris/);
		expect(text).toMatch(/Lexi/);

		// Globally-sorted by score (descending). Top-rank items from each instance
		// get score 1 - 0/N = 1.0; for Iris (3 items) the second item has score
		// 1 - 1/3 ≈ 0.67, etc. The first item rendered must therefore be a
		// top-rank result (n1, i1, or l1), not e.g. Iris's third item (i3) which
		// has the lowest score (~0.33).
		const firstRow = rows[0]?.textContent ?? "";
		const lastRow = rows[rows.length - 1]?.textContent ?? "";
		const topPossibilities = [
			/Ben works on CodeWalnut/, // Neo rank 0 — score 1.0
			/Ben drinks espresso/, // Iris rank 0 — score 1.0
			/Ben writes haikus/, // Lexi rank 0 — score 1.0
		];
		expect(topPossibilities.some((re) => re.test(firstRow))).toBe(true);
		// Iris's third item (lowest score ~0.33) must NOT be the first row.
		expect(firstRow).not.toMatch(/Ben uses Macs/);
		// And the last row should be the lowest-score one (Iris i3).
		expect(lastRow).toMatch(/Ben uses Macs/);
	});

	it("grouped view renders one section per selected instance", async () => {
		saveStore({ instances: [NEO, IRIS, LEXI], activeId: "neo" });

		renderAt("/fleet-query?q=ben&peer=ben&view=grouped&instances=neo,iris");

		await waitFor(() => {
			expect(screen.getByText(/Ben works on CodeWalnut/)).toBeInTheDocument();
			expect(screen.getByText(/Ben drinks espresso/)).toBeInTheDocument();
		});
		// Lexi was filtered out via instances=neo,iris
		expect(screen.queryByText(/Ben writes haikus/)).not.toBeInTheDocument();
	});
});
