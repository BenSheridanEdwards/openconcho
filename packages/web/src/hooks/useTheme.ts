import { type Theme, applyTheme, getStoredTheme } from "@/lib/theme";
import { useEffect, useState } from "react";

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	function toggle() {
		setTheme((t) => (t === "dark" ? "light" : "dark"));
	}

	return { theme, toggle };
}
