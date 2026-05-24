// Regenerate the /audit screenshots in docs/identity-audit/.
//
// Usage (start a Vite dev server first on port 5175 so we don't fight the
// default 5173 if one is already running):
//
//   pnpm --filter @openconcho/web exec vite --port 5175 --strictPort &
//   node packages/web/scripts/capture-audit-screenshots.mjs
//
// Seeds 5 instances pointing at the Hermes fleet's actual Honcho processes
// (localhost:8001-8005), navigates to /audit in each theme, waits for every
// row to leave the loading state, and writes two PNGs into
// docs/identity-audit/. Chromium runs with web security disabled so the
// browser doesn't block the per-instance CORS allowlist — the real desktop
// client achieves the same thing via Tauri's Rust-backed fetch (see lib/http
// .ts). If the fleet isn't running, rows render their error state instead.

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../../docs/identity-audit");
const URL_BASE = process.env.AUDIT_URL ?? "http://localhost:5175";

// Real port→agent mapping for the Hermes fleet (see project_hermes_honcho).
// Each port runs its own Honcho process with a single per-agent workspace.
const SEED = {
	instances: [
		{ id: "neo", name: "Neo", baseUrl: "http://localhost:8001", token: "" },
		{ id: "iris", name: "Iris", baseUrl: "http://localhost:8002", token: "" },
		{ id: "lexi", name: "Lexi", baseUrl: "http://localhost:8003", token: "" },
		{ id: "divinci", name: "DiVinci", baseUrl: "http://localhost:8004", token: "" },
		{ id: "jeeves", name: "Jeeves", baseUrl: "http://localhost:8005", token: "" },
	],
	activeId: "neo",
};

async function capture(theme) {
	// --disable-web-security lets the dev server (5175) call Honcho (8001-8005)
	// without the per-instance origin being in each Honcho's CORS allowlist.
	// In real use the desktop client routes fetches through Tauri (see lib/http
	// .ts), which bypasses the WebView CORS check the same way.
	const browser = await chromium.launch({
		args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
	});
	const ctx = await browser.newContext({
		// Wide enough to show all 7 default fact columns + the Agent column
		// without horizontal scroll.
		viewport: { width: 1680, height: 820 },
		bypassCSP: true,
	});
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
	// Wait for every row to leave the loading state — either ✓/✗ cells appear
	// or an error message ("Workspace fetch failed", "No workspaces", etc).
	await page.waitForFunction(
		() => {
			const rows = document.querySelectorAll("tbody tr");
			if (rows.length < 5) return false;
			return Array.from(rows).every(
				(r) => !/Loading…/.test(r.querySelector("th")?.textContent ?? ""),
			);
		},
		{ timeout: 15_000 },
	);
	// Give React one more paint to flush cell content.
	await page.waitForTimeout(250);

	const outPath = resolve(OUT_DIR, `${theme}.png`);
	await page.screenshot({ path: outPath, fullPage: false });
	console.log("wrote", outPath);

	await browser.close();
}

await mkdir(OUT_DIR, { recursive: true });
await capture("dark");
await capture("light");
