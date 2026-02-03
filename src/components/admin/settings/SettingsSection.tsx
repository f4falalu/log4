import { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

interface SettingsSectionProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  showSeparator?: boolean;
}

export function SettingsSection({
  title,
  description,
  badge,
  children,
  showSeparator = true,
}: SettingsSectionProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-8 py-6">
        <div className="flex-1 min-w-0 max-w-xs">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex-1">{children}</div>
      </div>
      {showSeparator && <Separator />}
    </>
  );
}
