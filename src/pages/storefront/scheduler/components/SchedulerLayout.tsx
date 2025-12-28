/**
 * =====================================================
 * Scheduler Layout Component
 * =====================================================
 * Main layout wrapper for the Scheduler page
 */

import { ReactNode } from 'react';

interface SchedulerLayoutProps {
  children: ReactNode;
}

export function SchedulerLayout({ children }: SchedulerLayoutProps) {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      {children}
    </div>
  );
}
