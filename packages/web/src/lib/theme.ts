const THEME_KEY = "openconcho:theme";

export type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
	const stored = localStorage.getItem(THEME_KEY) as Theme | null;
	if (stored === "dark" || stored === "light") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
	document.documentElement.setAttribute("data-theme", theme);
	localStorage.setItem(THEME_KEY, theme);
}
