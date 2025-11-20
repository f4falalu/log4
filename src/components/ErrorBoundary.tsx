import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  componentStack: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    componentStack: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service
    this.logErrorToService(error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
      componentStack: errorInfo.componentStack || '',
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In a real app, you would send this to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Example: Send to error reporting service
    // errorService.logError({
    //   error,
    //   errorInfo,
    //   componentStack: errorInfo.componentStack,
    //   timestamp: new Date().toISOString(),
    //   url: window.location.href,
    //   user: currentUser, // You would get this from your auth context
    // });
  }

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      componentStack: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `Error: ${error?.toString()}\n\nComponent Stack:\n${errorInfo?.componentStack}`;
    
    navigator.clipboard.writeText(errorDetails).then(
      () => alert('Error details copied to clipboard'),
      () => console.error('Failed to copy error details')
    );
  };

  public render() {
    const { hasError, error, errorInfo, componentStack } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback UI if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          const FallbackComponent = fallback as (
            props: { error: Error | null; errorInfo: ErrorInfo | null; resetError: () => void }
          ) => ReactNode;
          return <FallbackComponent error={error} errorInfo={errorInfo} resetError={this.handleReset} />;
        }
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred. Our team has been notified.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Error Details</h3>
                <div className="p-3 bg-gray-50 rounded-md text-sm font-mono text-red-600 overflow-x-auto">
                  {error?.toString() || 'Unknown error'}
                </div>
              </div>

              {process.env.NODE_ENV === 'development' && componentStack && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Component Stack</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={this.handleCopyError}
                      className="text-xs"
                    >
                      Copy Details
                    </Button>
                  </div>
                  <pre className="p-3 bg-gray-50 rounded-md text-xs text-gray-600 overflow-x-auto">
                    {componentStack}
                  </pre>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;