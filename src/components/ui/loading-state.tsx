/**
 * LoadingState Component - Standardized Loading UI
 *
 * This component provides consistent loading states across all views.
 * It standardizes:
 * - Loading spinner appearance and animation
 * - Loading message display
 * - Container sizing and positioning
 * - Accessibility (aria-labels)
 *
 * Usage:
 * ```tsx
 * {isLoading ? (
 *   <LoadingState message="Loading vehicles..." />
 * ) : (
 *   <YourContent />
 * )}
 * ```
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LoadingStateProps {
  /**
   * Optional loading message to display below spinner
   */
  message?: string;

  /**
   * Size variant of the loading spinner
   * @default "default"
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Whether to use full-height container (min-h-[400px])
   * @default true
   */
  fullHeight?: boolean;

  /**
   * Optional custom className for the container
   */
  className?: string;

  /**
   * Optional custom className for the spinner
   */
  spinnerClassName?: string;
}

// ============================================================================
// LoadingState Component
// ============================================================================

export function LoadingState({
  message,
  size = 'default',
  fullHeight = true,
  className,
  spinnerClassName,
}: LoadingStateProps) {
  // Size mappings for spinner
  const sizeClasses = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullHeight && 'min-h-[400px]',
        !fullHeight && 'py-12',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      <Loader2
        className={cn(
          'animate-spin text-muted-foreground',
          sizeClasses[size],
          spinnerClassName
        )}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      <span className="sr-only">{message || 'Loading content, please wait'}</span>
    </div>
  );
}

// ============================================================================
// LoadingState Variants
// ============================================================================

/**
 * Inline loading state for small components or cards
 */
export function InlineLoadingState({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <LoadingState
      message={message}
      size="sm"
      fullHeight={false}
      className={cn('py-6', className)}
    />
  );
}

/**
 * Table loading state with appropriate spacing
 */
export function TableLoadingState({
  message = 'Loading data...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <LoadingState
      message={message}
      size="default"
      fullHeight={false}
      className={cn('py-12', className)}
    />
  );
}

/**
 * Page loading state for full-page loads
 */
export function PageLoadingState({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <LoadingState
      message={message}
      size="lg"
      fullHeight={true}
      className={className}
    />
  );
}

// ============================================================================
// Skeleton Loading Components
// ============================================================================

/**
 * Table skeleton loader for data tables
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 w-full bg-muted/50 animate-pulse rounded"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton loader for card grids
 */
export function CardSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="h-48 w-full bg-muted/50 animate-pulse rounded-lg"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default LoadingState;
