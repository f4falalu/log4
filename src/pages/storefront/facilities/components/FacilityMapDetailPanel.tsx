import {
  X,
  MapPin,
  Phone,
  User,
  Mail,
  Building2,
  Eye,
  Heart,
  FlaskConical,
  Warehouse,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Facility } from '@/types';
import { cn } from '@/lib/utils';

interface FacilityMapDetailPanelProps {
  facility: Facility | null;
  onClose: () => void;
  onViewDetails: (facility: Facility) => void;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  if (!value) return null;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="p-3 bg-muted rounded-lg text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value ?? 'N/A'}</div>
    </div>
  );
}

export function FacilityMapDetailPanel({
  facility,
  onClose,
  onViewDetails,
}: FacilityMapDetailPanelProps) {
  if (!facility) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{facility.name}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {facility.warehouse_code}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Photo Placeholder */}
      <div className="h-48 bg-muted flex items-center justify-center border-b">
        <Building2 className="h-16 w-16 text-muted-foreground/30" />
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Location */}
          <Section title="Location">
            <InfoRow icon={MapPin} label="Address" value={facility.address} />
            <div className="grid grid-cols-2 gap-2">
              <InfoRow label="State" value={facility.state} />
              <InfoRow label="LGA" value={facility.lga} />
            </div>
            {facility.ward && <InfoRow label="Ward" value={facility.ward} />}
          </Section>

          <Separator />

          {/* Metadata */}
          <Section title="Facility Details">
            <InfoRow
              icon={Warehouse}
              label="Warehouse Code"
              value={facility.warehouse_code}
            />
            <InfoRow
              icon={DollarSign}
              label="Funding Source"
              value={facility.funding_source?.replace('--', ' / ')}
            />
            <InfoRow label="Facility Type" value={facility.type} />
            <InfoRow label="IP Name" value={facility.ip_name?.toUpperCase()} />
          </Section>

          <Separator />

          {/* Programmes */}
          <Section title="Programme">
            <div className="flex flex-wrap gap-2">
              {facility.programme && (
                <Badge variant="default">{facility.programme}</Badge>
              )}
              {facility.level_of_care && (
                <Badge variant="outline">{facility.level_of_care}</Badge>
              )}
              {facility.service_zone && (
                <Badge variant="secondary">{facility.service_zone}</Badge>
              )}
            </div>
          </Section>

          <Separator />

          {/* Capacity Metrics */}
          <Section title="Capacity">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Storage Capacity"
                value={facility.storage_capacity?.toLocaleString()}
              />
              <MetricCard
                label="General Capacity"
                value={facility.capacity?.toLocaleString()}
              />
            </div>
          </Section>

          <Separator />

          {/* Services */}
          <Section title="Services Available">
            <div className="flex flex-wrap gap-2">
              {facility.pcr_service && (
                <Badge variant="outline" className="gap-1">
                  <Heart className="h-3 w-3 text-green-500" />
                  PCR
                </Badge>
              )}
              {facility.cd4_service && (
                <Badge variant="outline" className="gap-1">
                  <FlaskConical className="h-3 w-3 text-blue-500" />
                  CD4
                </Badge>
              )}
              {!facility.pcr_service && !facility.cd4_service && (
                <span className="text-sm text-muted-foreground">
                  No services listed
                </span>
              )}
            </div>
          </Section>

          <Separator />

          {/* Contact Information */}
          <Section title="Contact">
            <InfoRow
              icon={User}
              label="Contact Person"
              value={facility.contact_name_pharmacy}
            />
            {facility.designation && (
              <InfoRow label="Designation" value={facility.designation} />
            )}
            <InfoRow
              icon={Phone}
              label="Phone"
              value={facility.phone_pharmacy || facility.phone}
            />
            <InfoRow icon={Mail} label="Email" value={facility.email} />
          </Section>
        </div>
      </ScrollArea>

      {/* Footer Action */}
      <div className="p-4 border-t">
        <Button className="w-full" onClick={() => onViewDetails(facility)}>
          <Eye className="h-4 w-4 mr-2" />
          View Full Details
        </Button>
      </div>
    </div>
  );
}
