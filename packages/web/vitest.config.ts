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
			// Conservative starting floor — ratchet up as coverage grows.
			// Drop below these and CI fails.
			thresholds: {
				lines: 25,
				functions: 25,
				branches: 50,
				statements: 25,
			},
		},
	},
});
