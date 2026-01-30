/**
 * =====================================================
 * Three Column Layout
 * =====================================================
 * Reusable 3-column layout for Schedule and Batch phases.
 * Provides responsive behavior and consistent spacing.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface ColumnProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function ThreeColumnLayout({ children, className }: ThreeColumnLayoutProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0',
        className
      )}
    >
      {children}
    </div>
  );
}

export function LeftColumn({ children, className, title, subtitle, action }: ColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col bg-muted/30 rounded-lg border overflow-hidden',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div>
            {title && (
              <h3 className="font-medium text-sm">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}

export function MiddleColumn({ children, className, title, subtitle, action }: ColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col bg-background rounded-lg border overflow-hidden',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            {title && (
              <h3 className="font-medium text-sm">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}

export function RightColumn({ children, className, title, subtitle, action }: ColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col bg-muted/30 rounded-lg border overflow-hidden',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div>
            {title && (
              <h3 className="font-medium text-sm">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// Export column components as part of ThreeColumnLayout namespace
ThreeColumnLayout.Left = LeftColumn;
ThreeColumnLayout.Middle = MiddleColumn;
ThreeColumnLayout.Right = RightColumn;

export default ThreeColumnLayout;
