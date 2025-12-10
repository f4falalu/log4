/**
 * ErrorState Component
 * Standardized error display for the application
 * Matches EmptyState component design patterns
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  variant?: 'default' | 'dashed';
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  error,
  onRetry,
  variant = 'default',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        variant === 'dashed' &&
          'border-2 border-dashed border-destructive/25 rounded-lg bg-destructive/5',
        className
      )}
    >
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
      {error && (
        <details className="text-xs text-muted-foreground mb-4 max-w-lg">
          <summary className="cursor-pointer hover:text-foreground transition-colors">
            Show error details
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded text-left overflow-auto max-h-32 text-xs">
            {typeof error === 'string' ? error : error.message}
            {typeof error !== 'string' && error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
