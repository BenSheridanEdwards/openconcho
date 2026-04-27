const DEMO_KEY = "openconcho:demo";

export function getDemoMode(): boolean {
	return localStorage.getItem(DEMO_KEY) === "true";
}

export function applyDemoMode(enabled: boolean): void {
	document.documentElement.setAttribute("data-demo", String(enabled));
	localStorage.setItem(DEMO_KEY, String(enabled));
}
