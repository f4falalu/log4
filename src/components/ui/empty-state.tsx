/**
 * EmptyState Component - Standardized Empty State UI
 *
 * This component provides a consistent empty state experience across the application.
 * It standardizes:
 * - Icon display
 * - Message hierarchy (title + description)
 * - Optional call-to-action button
 * - Spacing and alignment
 *
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={Package}
 *   title="No vehicles found"
 *   description="Add your first vehicle to get started with fleet management."
 *   action={
 *     <Button onClick={handleAdd}>
 *       <Plus className="h-4 w-4 mr-2" />
 *       Add Vehicle
 *     </Button>
 *   }
 * />
 * ```
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface EmptyStateProps {
  /**
   * Icon component from lucide-react (optional)
   * Will be displayed above the title
   */
  icon?: LucideIcon;

  /**
   * Main empty state title
   * Required for accessibility
   */
  title: string;

  /**
   * Optional description text providing more context
   */
  description?: string;

  /**
   * Optional call-to-action button or element
   * Typically a Button component
   */
  action?: React.ReactNode;

  /**
   * Optional custom className for the container
   */
  className?: string;

  /**
   * Variant for different visual styles
   */
  variant?: 'default' | 'dashed';
}

// ============================================================================
// EmptyState Component
// ============================================================================

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        variant === 'dashed' && 'rounded-lg border border-dashed bg-muted/30',
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      {Icon && (
        <Icon
          className="h-12 w-12 text-muted-foreground/50 mb-4"
          aria-hidden="true"
        />
      )}

      {/* Title */}
      <h3 className="text-lg font-medium text-foreground mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}

      {/* Call to Action */}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default EmptyState;
