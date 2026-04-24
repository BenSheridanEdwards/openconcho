import { COLOR } from "@/lib/constants";

interface ErrorAlertProps {
	error: Error | null;
	message?: string;
}

export function ErrorAlert({ error, message }: ErrorAlertProps) {
	if (!error) return null;
	return (
		<div
			className="rounded-xl p-4 mb-4"
			style={{
				background: COLOR.destructiveDim,
				border: `1px solid ${COLOR.destructiveBorderStrong}`,
			}}
		>
			<p className="text-sm font-medium" style={{ color: COLOR.destructive }}>
				{message ?? "An error occurred"}
			</p>
			<p className="text-xs mt-1 font-mono" style={{ color: COLOR.destructiveMuted }}>
				{error.message}
			</p>
		</div>
	);
}
