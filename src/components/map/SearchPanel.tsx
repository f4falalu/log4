import { GeoapifyAddressSearch } from '@/components/GeoapifyAddressSearch';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FLOATING_PANEL, CONTAINER, SPACING, Z_INDEX } from '@/lib/mapDesignSystem';
import { cn } from '@/lib/utils';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export function SearchPanel({ isOpen, onClose, onLocationSelect }: SearchPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn('absolute top-20 left-4', FLOATING_PANEL.base, CONTAINER.panel, 'p-4')}
      style={{ zIndex: Z_INDEX.floatingPanels }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Search Location</h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <GeoapifyAddressSearch
        onSelect={(place) => {
          onLocationSelect(place.lat, place.lon, place.formatted);
          onClose();
        }}
        placeholder="Search for address, facility, or landmark..."
      />
    </div>
  );
}
