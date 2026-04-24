import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// Route fetch through Rust (reqwest) when running in Tauri — bypasses WebView CORS enforcement.
// Falls back to native browser fetch during plain web dev (`pnpm dev:web`).
const isTauri = Boolean(
	typeof window !== "undefined" &&
		(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__,
);

export const httpFetch: typeof globalThis.fetch = isTauri
	? (tauriFetch as typeof globalThis.fetch)
	: globalThis.fetch;
