import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card-bg border border-border-subtle rounded-3xl p-8 shadow-soft-lg text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-text-main mb-2">Something went wrong</h1>
            <p className="text-text-muted mb-8 leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {this.state.error && (
              <div className="bg-app-bg/50 rounded-xl p-4 mb-8 text-left overflow-auto max-h-32 border border-border-subtle">
                <p className="text-xs font-mono text-rose-400">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-sage-500 hover:bg-sage-600 text-white rounded-2xl font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg"
            >
              <RotateCcw className="w-5 h-5" />
              Reset Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
