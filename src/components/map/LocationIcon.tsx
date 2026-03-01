import { Warehouse, Building2, MapPin, LucideIcon } from 'lucide-react';
import { FacilityType } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface LocationIconProps {
  type?: FacilityType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface IconConfig {
  icon: LucideIcon;
  emoji: string;
  bgColor: string;
  textColor: string;
  label: string;
}

const iconConfig: Record<FacilityType | 'default', IconConfig> = {
  warehouse: {
    icon: Warehouse,
    emoji: '🏭',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-500',
    label: 'Warehouse',
  },
  facility: {
    icon: Building2,
    emoji: '🏥',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-500',
    label: 'Facility',
  },
  public: {
    icon: MapPin,
    emoji: '📍',
    bgColor: 'bg-muted-foreground',
    textColor: 'text-muted-foreground',
    label: 'Public Location',
  },
  default: {
    icon: Building2,
    emoji: '🏢',
    bgColor: 'bg-primary',
    textColor: 'text-primary',
    label: 'Location',
  },
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function LocationIcon({ type, className, size = 'md' }: LocationIconProps) {
  const config = iconConfig[type || 'default'];
  const Icon = config.icon;

  return <Icon className={cn(sizeClasses[size], config.textColor, className)} />;
}

export function getLocationEmoji(type?: FacilityType): string {
  return iconConfig[type || 'default'].emoji;
}

export function getLocationConfig(type?: FacilityType): IconConfig {
  return iconConfig[type || 'default'];
}

export function getMarkerHtml(type?: FacilityType, index?: number): string {
  const config = iconConfig[type || 'default'];
  
  // Color mapping for marker backgrounds
  const bgColorClass = type === 'warehouse' 
    ? 'background: #f97316;' // orange-500
    : type === 'facility'
    ? 'background: #3b82f6;' // blue-500
    : type === 'public'
    ? 'background: #6b7280;' // gray-500
    : 'background: hsl(var(--primary));';

  return `
    <div class="relative">
      <div class="absolute -inset-2 rounded-full animate-ping opacity-30" style="${bgColorClass} animation-duration: 2s;"></div>
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-lg" style="${bgColorClass} border-color: white;">
        <span class="text-lg">${config.emoji}</span>
        ${index !== undefined ? `
          <span class="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border-2" style="background: hsl(var(--background)); border-color: white; color: hsl(var(--foreground));">
            ${index + 1}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}
