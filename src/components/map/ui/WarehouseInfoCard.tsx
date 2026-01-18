/**
 * WarehouseInfoCard Component
 *
 * Right-side info card showing warehouse details when clicked on map
 * Reference: Rentizy property detail card pattern
 *
 * Design: Clean card layout with key stats and actions
 */

import { X, MapPin, Package, Clock, Building2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Warehouse } from '@/types';

interface WarehouseInfoCardProps {
  warehouse: Warehouse;
  onClose: () => void;
}

/**
 * Info row component
 */
function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: any;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className || ''}`}>
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

/**
 * Section component
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

/**
 * Warehouse Info Card
 */
export function WarehouseInfoCard({ warehouse, onClose }: WarehouseInfoCardProps) {
  // Format coordinates
  const coords = `${warehouse.lat.toFixed(4)}, ${warehouse.lng.toFixed(4)}`;

  // Determine warehouse type badge
  const typeBadge = warehouse.type === 'central' ? (
    <Badge variant="default">Central Hub</Badge>
  ) : (
    <Badge variant="secondary">Zonal</Badge>
  );

  return (
    <div className="fixed right-0 top-0 h-full w-[360px] bg-background border-l border-border z-[1100] flex flex-col overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {warehouse.name}
          </h3>
          <div className="mt-1">{typeBadge}</div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-muted transition-colors flex-shrink-0 ml-2"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Location */}
        <Section title="Location">
          <InfoRow
            icon={MapPin}
            label="Address"
            value={warehouse.address}
          />
          <InfoRow label="Coordinates" value={coords} className="text-xs text-muted-foreground" />
        </Section>

        <Separator />

        {/* Warehouse Details */}
        <Section title="Warehouse Details">
          <InfoRow
            icon={Building2}
            label="Type"
            value={warehouse.type === 'central' ? 'Central Hub' : 'Zonal Warehouse'}
          />
          <InfoRow
            icon={Package}
            label="Capacity"
            value={`${warehouse.capacity.toLocaleString()} units`}
          />
          <InfoRow
            icon={Clock}
            label="Operating Hours"
            value={warehouse.operatingHours}
          />
        </Section>

        <Separator />

        {/* Statistics (Placeholder - would come from API in production) */}
        <Section title="Current Status">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-xs text-muted-foreground">Active Routes</div>
              <div className="text-2xl font-bold text-foreground mt-1">-</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-xs text-muted-foreground">Utilization</div>
              <div className="text-2xl font-bold text-foreground mt-1 flex items-center gap-1">
                - <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2 bg-muted/30">
        <Button variant="outline" className="flex-1" size="sm">
          View Deliveries
        </Button>
        <Button variant="default" className="flex-1" size="sm">
          View Routes
        </Button>
      </div>
    </div>
  );
}
