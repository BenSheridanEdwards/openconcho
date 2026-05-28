// Capture screenshots of the Conclusion Diff view for the README / PR.
//
// Usage:
//   1. Start the dev server:  pnpm --filter @openconcho/web dev
//   2. Then in another shell: node docs/conclusion-diff/capture.mjs
//
// The script stubs the Honcho API at the network layer with `page.route`, so
// no real backend is required. Output PNGs land in this directory.

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// @playwright/test (a workspace dep via the catalog) re-exports `chromium`.
const require = createRequire(resolve(__dirname, "../../packages/web/package.json"));
const { chromium } = require("@playwright/test");

const OUT_DIR = resolve(__dirname);
mkdirSync(OUT_DIR, { recursive: true });

const BASE = process.env.OPENCONCHO_BASE_URL ?? "http://localhost:5189";

function utcStamp(offsetMs) {
	const d = new Date(Date.now() - offsetMs);
	const p = (x) => String(x).padStart(2, "0");
	return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
const days = (n) => utcStamp(n * 24 * 60 * 60 * 1000);
const hours = (n) => utcStamp(n * 60 * 60 * 1000);

const RICH_DATA = [
	// Unchanged (in both snapshots, not displayed)
	{
		id: "c-001",
		content: "User strongly prefers concise, terse responses without preamble or filler.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: days(14),
	},
	{
		id: "c-002",
		content: "Works at CodeWalnut on agentic engineering projects.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: days(12),
	},
	// Modified: same id at two timestamps with different content.
	{
		id: "c-010",
		content: "Prefers dark mode UI and high contrast for code review.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: days(10),
	},
	{
		id: "c-010",
		content:
			"Prefers dark mode UI, high contrast for code review, and DM Mono for code blocks specifically.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: hours(6),
	},
	// Added (within window)
	{
		id: "c-201",
		content:
			"Adopted a worktree-per-feature workflow to isolate concurrent agent work and avoid clobbering.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: days(2),
	},
	{
		id: "c-202",
		content:
			"Cares about open-source PR quality — wants screenshots, tests, and clean commit history before opening reviews.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: days(1),
	},
	{
		id: "c-203",
		content:
			"Benchmarks dreamer models by snapshotting the same observation set across two runs and diffing conclusions.",
		observer_id: "iris",
		observed_id: "ben",
		session_id: null,
		created_at: hours(12),
	},
];

function makeListResponse(items) {
	return { items, total: items.length, page: 1, size: 100, pages: 1 };
}

async function setupRouting(page, conclusionsItems) {
	await page.addInitScript(() => {
		localStorage.setItem(
			"openconcho:instances",
			JSON.stringify({
				instances: [{ id: "demo-inst", name: "Demo", baseUrl: "http://localhost:9999", token: "" }],
				activeId: "demo-inst",
			}),
		);
	});
	await page.route("**/localhost:9999/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/conclusions/list")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(makeListResponse(conclusionsItems)),
			});
		}
		if (url.endsWith("/v3/workspaces")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ id: "demo-ws", metadata: {}, created_at: "2026-05-01 10:00:00" }),
			});
		}
		if (url.includes("/queue/status")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ total_work_units: 0, pending_work_units: 0, sessions: {} }),
			});
		}
		return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
	});
}

async function shoot(page, file) {
	await page.waitForTimeout(400);
	await page.screenshot({ path: `${OUT_DIR}/${file}`, fullPage: false });
	console.log(`✓ ${file}`);
}

(async () => {
	const browser = await chromium.launch();

	// 1. Empty state (dark)
	{
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 980 },
			deviceScaleFactor: 2,
			colorScheme: "dark",
		});
		const page = await ctx.newPage();
		await setupRouting(page, []);
		await page
			.goto(`${BASE}/workspaces/demo-ws/diff`, { waitUntil: "networkidle" })
			.catch(() => {});
		await page.waitForSelector("text=Conclusion Diff");
		await page.waitForSelector("text=No conclusions found");
		await shoot(page, "01-empty-state.png");
		await ctx.close();
	}

	// 2. Populated diff (dark)
	{
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 980 },
			deviceScaleFactor: 2,
			colorScheme: "dark",
		});
		const page = await ctx.newPage();
		await setupRouting(page, RICH_DATA);
		await page
			.goto(`${BASE}/workspaces/demo-ws/diff`, { waitUntil: "networkidle" })
			.catch(() => {});
		await page.waitForSelector("text=Conclusion Diff");
		await page.waitForSelector("text=Added");
		await shoot(page, "02-populated-diff.png");
		await ctx.close();
	}

	// 3. Populated diff (light)
	{
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 980 },
			deviceScaleFactor: 2,
			colorScheme: "light",
		});
		const page = await ctx.newPage();
		await page.addInitScript(() => localStorage.setItem("openconcho:theme", "light"));
		await setupRouting(page, RICH_DATA);
		await page
			.goto(`${BASE}/workspaces/demo-ws/diff`, { waitUntil: "networkidle" })
			.catch(() => {});
		await page.waitForSelector("text=Conclusion Diff");
		await page.waitForSelector("text=Added");
		await shoot(page, "03-populated-light.png");
		await ctx.close();
	}

	await browser.close();
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
