import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8" data-testid="error-boundary">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400/60" />
          </div>
          <h3 className="text-lg font-bold text-white/80 mb-2">Something went wrong</h3>
          <p className="text-sm text-white/30 mb-6 text-center max-w-md">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-white/10"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            data-testid="button-error-refresh"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
