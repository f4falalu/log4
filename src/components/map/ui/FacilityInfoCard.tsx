/**
 * FacilityInfoCard Component
 *
 * Right-side info card showing facility details when clicked on map
 * Reference: Rentizy property detail card pattern
 *
 * Design: Clean card layout with healthcare-specific stats
 */

import { X, MapPin, Phone, User, Clock, Building, Heart, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Facility, FacilityType } from '@/types';

interface FacilityInfoCardProps {
  facility: Facility;
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
 * Get facility type badge variant
 */
function getFacilityTypeBadge(type?: FacilityType) {
  const typeMap: Record<FacilityType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    hospital: { label: 'Hospital', variant: 'destructive' },
    clinic: { label: 'Clinic', variant: 'default' },
    pharmacy: { label: 'Pharmacy', variant: 'secondary' },
    health_center: { label: 'Health Center', variant: 'default' },
    lab: { label: 'Laboratory', variant: 'outline' },
    other: { label: 'Other', variant: 'outline' },
  };

  const config = type ? typeMap[type] : { label: 'Facility', variant: 'outline' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * Facility Info Card
 */
export function FacilityInfoCard({ facility, onClose }: FacilityInfoCardProps) {
  // Format coordinates
  const coords = `${facility.lat.toFixed(4)}, ${facility.lng.toFixed(4)}`;

  return (
    <div className="fixed right-0 top-0 h-full w-[360px] bg-background border-l border-border z-[1100] flex flex-col overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {facility.name}
          </h3>
          <div className="mt-1">{getFacilityTypeBadge(facility.type)}</div>
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
            value={facility.address}
          />
          <InfoRow label="Coordinates" value={coords} className="text-xs text-muted-foreground" />
        </Section>

        <Separator />

        {/* Contact Information */}
        <Section title="Contact">
          {facility.phone && (
            <InfoRow
              icon={Phone}
              label="Phone"
              value={facility.phone}
            />
          )}
          {facility.contactPerson && (
            <InfoRow
              icon={User}
              label="Contact Person"
              value={facility.contactPerson}
            />
          )}
          {facility.operatingHours && (
            <InfoRow
              icon={Clock}
              label="Operating Hours"
              value={facility.operatingHours}
            />
          )}
        </Section>

        <Separator />

        {/* Facility Details */}
        <Section title="Facility Details">
          <InfoRow
            icon={Building}
            label="Warehouse Code"
            value={facility.warehouse_code}
          />
          {facility.level_of_care && (
            <InfoRow
              label="Level of Care"
              value={facility.level_of_care}
            />
          )}
          {facility.service_zone && (
            <InfoRow
              label="Service Zone"
              value={facility.service_zone}
            />
          )}
          {facility.ip_name && (
            <InfoRow
              label="IP Name"
              value={facility.ip_name.toUpperCase()}
            />
          )}
        </Section>

        <Separator />

        {/* Services Available */}
        <Section title="Services">
          <div className="grid grid-cols-2 gap-2">
            {facility.pcr_service && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border flex items-center gap-2">
                <Heart className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium">PCR</span>
              </div>
            )}
            {facility.cd4_service && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">CD4</span>
              </div>
            )}
            {facility.art_treatment && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium">ART</span>
              </div>
            )}
            {facility.fp_services && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border flex items-center gap-2">
                <Heart className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium">FP</span>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2 bg-muted/30">
        <Button variant="outline" className="flex-1" size="sm">
          View Stock
        </Button>
        <Button variant="default" className="flex-1" size="sm">
          View Deliveries
        </Button>
      </div>
    </div>
  );
}
