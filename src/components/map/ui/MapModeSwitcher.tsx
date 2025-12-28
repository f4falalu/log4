/**
 * MapModeSwitcher Component
 *
 * Tab-based navigation between map capabilities
 * Displays only capabilities allowed for the current user's role
 */

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Radio,
  MapPin,
  History,
  Eye,
  Beaker,
} from 'lucide-react';
import type { MapCapability } from '@/lib/mapCapabilities';
import { cn } from '@/lib/utils';

interface MapModeSwitcherProps {
  currentCapability: MapCapability;
  availableCapabilities: MapCapability[];
  onCapabilityChange: (capability: MapCapability) => void;
  className?: string;
}

/**
 * Icon mapping for each capability
 */
const CAPABILITY_ICON_MAP: Record<MapCapability, React.ComponentType<{ className?: string }>> = {
  operational: Radio,
  planning: MapPin,
  forensics: History,
  overview: Eye,
  simulation: Beaker,
};

/**
 * Label mapping for each capability
 */
const CAPABILITY_LABEL_MAP: Record<MapCapability, string> = {
  operational: 'Operational',
  planning: 'Planning',
  forensics: 'Forensics',
  overview: 'Overview',
  simulation: 'Simulation',
};

/**
 * Description mapping for each capability (for tooltips)
 */
const CAPABILITY_DESCRIPTION_MAP: Record<MapCapability, string> = {
  operational: 'Live execution control with Trade-Off workflow',
  planning: 'Spatial configuration with draft → activate workflow',
  forensics: 'Immutable historical analysis',
  overview: 'Executive and donor visibility',
  simulation: 'What-if scenario testing (sandbox)',
};

export function MapModeSwitcher({
  currentCapability,
  availableCapabilities,
  onCapabilityChange,
  className,
}: MapModeSwitcherProps) {
  return (
    <Tabs
      value={currentCapability}
      onValueChange={(value) => onCapabilityChange(value as MapCapability)}
      className={cn('w-auto', className)}
    >
      <TabsList className="bg-muted/50 p-1">
        {availableCapabilities.map((capability) => {
          const Icon = CAPABILITY_ICON_MAP[capability];
          const label = CAPABILITY_LABEL_MAP[capability];
          const description = CAPABILITY_DESCRIPTION_MAP[capability];

          return (
            <TabsTrigger
              key={capability}
              value={capability}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5',
                'data-[state=active]:bg-background data-[state=active]:shadow-sm',
                'transition-all duration-200'
              )}
              title={description}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium hidden sm:inline">
                {label}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
