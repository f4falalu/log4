import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { searchAddress, GeoapifyPlace } from '@/lib/geoapify';
import { MapPin } from 'lucide-react';

interface GeoapifyAddressSearchProps {
  onSelect: (place: GeoapifyPlace) => void;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
}

export function GeoapifyAddressSearch({
  onSelect,
  label = 'Address',
  placeholder = 'Search for an address...',
  defaultValue = ''
}: GeoapifyAddressSearchProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<GeoapifyPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      const places = await searchAddress(query);
      setResults(places);
      setIsSearching(false);
      setIsOpen(true);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSelect = (place: GeoapifyPlace) => {
    setQuery(place.formatted);
    setIsOpen(false);
    onSelect(place);
  };

  return (
    <div className="relative">
      <Label>{label}</Label>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((place, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleSelect(place)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{place.address_line1}</p>
                {place.address_line2 && (
                  <p className="text-xs text-muted-foreground truncate">{place.address_line2}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {isSearching && (
        <div className="absolute right-3 top-9 text-xs text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  );
}
