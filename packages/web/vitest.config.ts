import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	define: {
		__APP_VERSION__: JSON.stringify("0.0.0-test"),
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		css: false,
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", "dist", "e2e"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary", "lcov"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.{test,spec}.{ts,tsx}",
				"src/test/**",
				"src/routeTree.gen.ts",
				"src/api/schema.d.ts",
				"src/main.tsx",
				"src/vite-env.d.ts",
			],
			// Baseline floor from the current application coverage. Keep this
			// truthful initially, then ratchet upward as feature tests grow.
			thresholds: {
				lines: 22,
				functions: 14,
				branches: 14,
				statements: 22,
			},
		},
	},
});
