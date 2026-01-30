/**
 * PageShell Component - Standardized Page Wrapper
 *
 * This component provides consistent padding and max-width constraints for non-full-bleed pages.
 * Use this for standard document-style pages that should have breathing room from edges.
 *
 * Usage:
 * ```tsx
 * <PageShell maxWidth="7xl">
 *   <PageLayout title="My Page" subtitle="Description">
 *     {content}
 *   </PageLayout>
 * </PageShell>
 * ```
 *
 * Or standalone:
 * ```tsx
 * <PageShell>
 *   <div>Your content with standard padding</div>
 * </PageShell>
 * ```
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PageShellProps {
  /**
   * Page content
   */
  children: React.ReactNode;

  /**
   * Maximum width constraint (default: '7xl' = 80rem = 1280px)
   * Set to 'full' for no max-width constraint
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

  /**
   * Whether to center the container (default: true)
   */
  centered?: boolean;

  /**
   * Custom padding (overrides default px-6 lg:px-8 py-6)
   */
  padding?: string;

  /**
   * Optional custom className
   */
  className?: string;
}

// ============================================================================
// PageShell Component
// ============================================================================

export function PageShell({
  children,
  maxWidth = '7xl',
  centered = true,
  padding,
  className = '',
}: PageShellProps) {
  const maxWidthClass = maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth}`;
  const defaultPadding = 'px-6 lg:px-8 py-6';
  const centerClass = centered ? 'mx-auto' : '';

  return (
    <div
      className={cn(
        'w-full',
        maxWidthClass,
        centerClass,
        padding || defaultPadding,
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default PageShell;
