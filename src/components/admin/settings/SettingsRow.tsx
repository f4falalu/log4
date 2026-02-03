import { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface SettingsSwitchRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingsSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SettingsSwitchRowProps) {
  return (
    <SettingsRow label={label} description={description}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </SettingsRow>
  );
}
