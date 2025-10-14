import { GeoapifyAddressSearch } from '@/components/GeoapifyAddressSearch';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export function SearchPanel({ isOpen, onClose, onLocationSelect }: SearchPanelProps) {
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-20 left-4 z-[1000] w-96 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Search Location</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
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
