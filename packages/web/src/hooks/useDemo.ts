import { useEffect, useState } from "react";
import { applyDemoMode, getDemoMode } from "@/lib/demo";

export function useDemo() {
	const [demo, setDemo] = useState<boolean>(() => getDemoMode());

	useEffect(() => {
		applyDemoMode(demo);
	}, [demo]);

	function toggle() {
		setDemo((d) => !d);
	}

	return { demo, toggle };
}
