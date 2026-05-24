import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

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

describe("Compare route", () => {
	it("prompts the user to add instances when none are selected", async () => {
		saveStore({
			instances: [
				{ id: "neo", name: "Neo", baseUrl: "http://localhost:8001", token: "" },
				{ id: "iris", name: "Iris", baseUrl: "http://localhost:8002", token: "" },
			],
			activeId: "neo",
		});
		renderAt("/compare");
		expect(await screen.findByText(/Pick instances to compare/i)).toBeInTheDocument();
	});
});
