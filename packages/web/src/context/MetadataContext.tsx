import { createContext, type ReactNode, useContext, useState } from "react";

const STORAGE_KEY = "openconcho:show-metadata";

interface MetadataContextValue {
	showMetadata: boolean;
	toggle: () => void;
}

const MetadataContext = createContext<MetadataContextValue | null>(null);

export function MetadataProvider({ children }: { children: ReactNode }) {
	const [showMetadata, setShowMetadata] = useState<boolean>(
		() => localStorage.getItem(STORAGE_KEY) === "true",
	);

	function toggle() {
		setShowMetadata((v) => {
			const next = !v;
			localStorage.setItem(STORAGE_KEY, String(next));
			return next;
		});
	}

	return (
		<MetadataContext.Provider value={{ showMetadata, toggle }}>{children}</MetadataContext.Provider>
	);
}

export function useMetadataContext(): MetadataContextValue {
	const ctx = useContext(MetadataContext);
	if (!ctx) throw new Error("useMetadataContext must be used within MetadataProvider");
	return ctx;
}
