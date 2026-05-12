import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	accent?: boolean;
}

export function Skeleton({ accent = false, className, ...props }: SkeletonProps) {
	return (
		<div
			aria-hidden="true"
			className={cn("theme-skeleton rounded-md", accent && "theme-skeleton--accent", className)}
			{...props}
		/>
	);
}
