/**
 * Map Layout Wrapper
 *
 * Shared layout for all map modes with:
 * - Mode switcher tabs at top
 * - Shared filters (date, zone, fleet)
 * - Persistent KPI ribbon (optional)
 * - Nested outlet for map mode pages
 */

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MapModeSwitcher } from '@/components/map/ui/MapModeSwitcher';
import { useMapContext } from '@/hooks/useMapContext';
import type { MapCapability } from '@/lib/mapCapabilities';
import { Map } from 'lucide-react';

export default function MapLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { capability, setCapability } = useMapContext();

  // Determine current capability from route
  const currentPath = location.pathname;
  const currentCapabilityFromRoute = getCurrentCapabilityFromPath(currentPath);

  // Available capabilities for Phase 1
  // TODO: Make this role-based from permission system
  const availableCapabilities: MapCapability[] = ['operational', 'planning', 'forensics'];

  const handleCapabilityChange = (newCapability: MapCapability) => {
    setCapability(newCapability);
    navigate(`/fleetops/map/${newCapability}`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar with Mode Switcher */}
      <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Map className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Map System
              </h1>
            </div>
          </div>

          <MapModeSwitcher
            currentCapability={currentCapabilityFromRoute || capability}
            availableCapabilities={availableCapabilities}
            onCapabilityChange={handleCapabilityChange}
          />
        </div>
      </div>

      {/* Map Mode Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Helper to extract capability from current path
 */
function getCurrentCapabilityFromPath(path: string): MapCapability | null {
  if (path.includes('/operational')) return 'operational';
  if (path.includes('/planning')) return 'planning';
  if (path.includes('/forensics')) return 'forensics';
  if (path.includes('/overview')) return 'overview';
  if (path.includes('/simulation')) return 'simulation';
  return null;
}
