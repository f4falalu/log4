import { MapPin, Heart, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Facility } from '@/types';

interface FacilityMapPopupProps {
  facility: Facility;
  onViewDetails: (facility: Facility) => void;
}

export function FacilityMapPopup({
  facility,
  onViewDetails,
}: FacilityMapPopupProps) {
  return (
    <div className="min-w-[280px] max-w-[320px] p-3 space-y-3">
      {/* Header */}
      <div>
        <h4 className="font-semibold text-sm">{facility.name}</h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>
            {facility.lga}
            {facility.lga && facility.state && ', '}
            {facility.state && facility.state.charAt(0).toUpperCase() + facility.state.slice(1)}
          </span>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2">
        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
        <span className="text-xs line-clamp-2">{facility.address}</span>
      </div>

      {/* Capacity Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-xs text-muted-foreground">Storage</div>
          <div className="text-sm font-medium">
            {facility.storage_capacity?.toLocaleString() ?? 'N/A'}
          </div>
        </div>
        <div className="text-center p-2 bg-muted rounded">
          <div className="text-xs text-muted-foreground">General</div>
          <div className="text-sm font-medium">
            {facility.capacity?.toLocaleString() ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Services */}
      {(facility.pcr_service || facility.cd4_service) && (
        <div className="flex gap-2">
          {facility.pcr_service && (
            <Badge variant="outline" className="text-xs gap-1">
              <Heart className="h-2.5 w-2.5 text-green-500" />
              PCR
            </Badge>
          )}
          {facility.cd4_service && (
            <Badge variant="outline" className="text-xs gap-1">
              <FlaskConical className="h-2.5 w-2.5 text-blue-500" />
              CD4
            </Badge>
          )}
        </div>
      )}

      {/* Action Button */}
      <Button
        size="sm"
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails(facility);
        }}
      >
        View Details
      </Button>
    </div>
  );
}
