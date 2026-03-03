import { RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorRetryProps {
    message?: string;
    onRetry: () => void;
}

export function ErrorRetry({ message = "Failed to load content", onRetry }: ErrorRetryProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="error-retry">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <WifiOff className="w-6 h-6 text-red-400/70" />
            </div>
            <p className="text-sm font-medium text-white/60 mb-1">{message}</p>
            <p className="text-xs text-white/25 mb-5">Check your connection or try again</p>
            <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]"
                onClick={onRetry}
                data-testid="button-retry"
            >
                <RefreshCcw className="w-3.5 h-3.5" />
                Retry
            </Button>
        </div>
    );
}
