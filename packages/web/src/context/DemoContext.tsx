import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { applyDemoMode, getDemoMode, maskValue } from "@/lib/demo";

interface DemoContextValue {
	demo: boolean;
	toggle: () => void;
	mask: (value: string) => string;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
	const [demo, setDemo] = useState<boolean>(() => getDemoMode());

	useEffect(() => {
		applyDemoMode(demo);
	}, [demo]);

	function toggle() {
		setDemo((d) => !d);
	}

	function mask(value: string): string {
		return demo ? maskValue(value) : value;
	}

	return <DemoContext.Provider value={{ demo, toggle, mask }}>{children}</DemoContext.Provider>;
}

export function useDemoContext(): DemoContextValue {
	const ctx = useContext(DemoContext);
	if (!ctx) throw new Error("useDemoContext must be used within DemoProvider");
	return ctx;
}
