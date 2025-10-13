import { useState } from 'react';
import { Driver, DriverVehicleHistory } from '@/types';
import { DriverListItem } from './DriverListItem';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, Star, Truck, CarFront } from 'lucide-react';
import { useDriverCategories } from '@/hooks/useDriverCategories';
import { cn } from '@/lib/utils';

interface DriverSidebarProps {
  drivers: Driver[] | undefined;
  allVehicles: DriverVehicleHistory[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
  favorites: string[];
  onToggleFavorite: (driverId: string) => void;
}

export function DriverSidebar({
  drivers,
  allVehicles,
  selectedDriverId,
  onSelectDriver,
  favorites,
  onToggleFavorite,
}: DriverSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState({
    favorites: true,
    trucks: true,
    vans: true,
    cars: false,
    other: false,
  });

  const categories = useDriverCategories(drivers, allVehicles, favorites);

  const filteredCategories = categories
    ? Object.entries(categories).reduce((acc, [key, items]) => {
        const filtered = items.filter(({ driver }) =>
          driver.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return { ...acc, [key]: filtered };
      }, {} as typeof categories)
    : null;

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'favorites':
        return <Star className="h-4 w-4" />;
      case 'trucks':
        return <Truck className="h-4 w-4" />;
      case 'vans':
      case 'cars':
        return <CarFront className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSectionTitle = (section: string) => {
    return section.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredCategories &&
            Object.entries(filteredCategories).map(([section, items]) => {
              if (items.length === 0) return null;

              return (
                <Collapsible
                  key={section}
                  open={openSections[section as keyof typeof openSections]}
                  onOpenChange={() => toggleSection(section as keyof typeof openSections)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    {getSectionIcon(section)}
                    <span className="flex-1 text-left">{getSectionTitle(section)}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        openSections[section as keyof typeof openSections] && 'rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {items.map(({ driver, vehicle }) => (
                      <DriverListItem
                        key={driver.id}
                        driver={driver}
                        vehicle={vehicle}
                        isActive={selectedDriverId === driver.id}
                        isFavorite={favorites.includes(driver.id)}
                        onSelect={() => onSelectDriver(driver.id)}
                        onToggleFavorite={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(driver.id);
                        }}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
