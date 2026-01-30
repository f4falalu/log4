/**
 * =====================================================
 * Scheduler Layout Component
 * =====================================================
 * Main layout wrapper for the Scheduler page
 */

import { ReactNode } from 'react';

interface SchedulerLayoutProps {
  header: ReactNode;
  content: ReactNode;
  summary: ReactNode;
  children?: ReactNode;
}

export function SchedulerLayout({ header, content, summary, children }: SchedulerLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      <header className="flex-shrink-0">{header}</header>
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">{content}</div>
      </main>
      <footer className="flex-shrink-0">{summary}</footer>
      {children}
    </div>
  );
}
