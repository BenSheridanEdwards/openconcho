/// <reference types="node" />

import { defineConfig, devices } from "@playwright/test";

const previewPort = process.env.PLAYWRIGHT_PREVIEW_PORT ?? "5173";
const previewUrl = `http://127.0.0.1:${previewPort}`;
const useExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	reporter: "list",
	use: {
		baseURL: previewUrl,
	},
	projects: [{ name: "webkit", use: { ...devices["Desktop Safari"] } }],
	webServer: useExternalServer
		? undefined
		: {
				command: "pnpm dev",
				url: previewUrl,
				reuseExistingServer: !process.env.CI,
				timeout: 60_000,
			},
});
