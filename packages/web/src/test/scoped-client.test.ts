import { describe, expect, it, vi } from "vitest";
import { createScopedClient } from "@/api/scopedClient";
import type { Instance } from "@/lib/config";

vi.mock("@/lib/http", () => ({
	httpFetch: vi.fn(async () => new Response("{}", { status: 200 })),
}));

const instance: Instance = {
	id: "inst-1",
	name: "Neo",
	baseUrl: "http://localhost:8001",
	token: "secret-token",
};

describe("createScopedClient", () => {
	it("issues requests to the instance baseUrl", async () => {
		const { httpFetch } = await import("@/lib/http");
		const client = createScopedClient(instance);
		await client.GET("/v3/keys" as never);

		const request = (httpFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Request;
		expect(request.url).toBe("http://localhost:8001/v3/keys");
	});

	it("attaches the instance token as a Bearer Authorization header", async () => {
		const { httpFetch } = await import("@/lib/http");
		const client = createScopedClient(instance);
		await client.GET("/v3/keys" as never);

		const request = (httpFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Request;
		expect(request.headers.get("Authorization")).toBe("Bearer secret-token");
	});
});
