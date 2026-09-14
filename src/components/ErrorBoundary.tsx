import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white">
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
            <h1 className="text-xl font-extrabold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-300 mb-4">
              An uncaught application error occurred.
            </p>
            <div className="mb-6 rounded-lg bg-slate-950 p-4 font-mono text-xs text-red-300 overflow-x-auto border border-red-900/50">
              {this.state.error?.toString() || 'Unknown runtime error'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600"
              >
                Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
