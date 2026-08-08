import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-3">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-2">
              Tronites encountered an unexpected error.
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <pre className="text-left text-xs bg-gray-100 p-3 rounded overflow-auto mt-3">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg hover:bg-primary-800"
              >
                Reload
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-300"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
