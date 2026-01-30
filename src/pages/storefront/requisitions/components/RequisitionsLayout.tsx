import { ReactNode } from 'react';

interface RequisitionsLayoutProps {
  header: ReactNode;
  content: ReactNode;
  summary: ReactNode;
  children?: ReactNode;
}

export function RequisitionsLayout({ header, content, summary, children }: RequisitionsLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0">
        {header}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {content}
        {children}
      </div>

      {/* Summary */}
      <div className="flex-shrink-0">
        {summary}
      </div>
    </div>
  );
}
