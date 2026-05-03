import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom doesn't implement matchMedia; theme code reads it on mount.
if (!window.scrollTo) {
	window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

if (!window.matchMedia) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

afterEach(() => {
	cleanup();
	localStorage.clear();
});
