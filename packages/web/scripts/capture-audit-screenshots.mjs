// Regenerate the /audit screenshots in docs/identity-audit/.
//
// Usage (start a Vite dev server first on port 5175 so we don't fight the
// default 5173 if one is already running):
//
//   pnpm --filter @openconcho/web exec vite --port 5175 --strictPort &
//   node packages/web/scripts/capture-audit-screenshots.mjs
//
// Seeds 5 mock instances mirroring the Hermes fleet, navigates to /audit in
// each theme, waits for the rows to render, and writes two PNGs into
// docs/identity-audit/. The seeded baseUrls don't resolve, so every row
// settles into the "Workspace fetch failed" error state — which is the point:
// this is the audit's offline preview.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../../docs/identity-audit");
const URL_BASE = process.env.AUDIT_URL ?? "http://localhost:5175";

const SEED = {
	instances: [
		{ id: "iris", name: "Iris", baseUrl: "http://localhost:8001", token: "" },
		{ id: "lexi", name: "Lexi", baseUrl: "http://localhost:8002", token: "" },
		{ id: "divinci", name: "DiVinci", baseUrl: "http://localhost:8003", token: "" },
		{ id: "neo", name: "Neo", baseUrl: "http://localhost:8004", token: "" },
		{ id: "jeeves", name: "Jeeves", baseUrl: "http://localhost:8005", token: "" },
	],
	activeId: "iris",
};

async function capture(theme) {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await ctx.newPage();

	// Visit once to get an origin so we can write localStorage.
	await page.goto(`${URL_BASE}/settings`);
	await page.evaluate(
		([seed, theme]) => {
			localStorage.setItem("openconcho:instances", JSON.stringify(seed));
			localStorage.setItem("openconcho:theme", theme);
		},
		[SEED, theme],
	);
	await page.goto(`${URL_BASE}/audit`, { waitUntil: "networkidle" });
	// Each row finishes either in "ok" or "error" once all 5 workspaces queries
	// resolve. Wait for the row count to settle.
	await page.waitForSelector("tbody tr:nth-child(5)");
	// Give React a frame to render the final status text.
	await page.waitForTimeout(500);

	const outPath = resolve(OUT_DIR, `${theme}.png`);
	await page.screenshot({ path: outPath, fullPage: false });
	console.log("wrote", outPath);

	await browser.close();
}

await mkdir(OUT_DIR, { recursive: true });
await capture("dark");
await capture("light");
