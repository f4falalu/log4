import { Card } from '@/components/ui/card';
import { Truck, Car, Bike, Container } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleCategory } from '@/hooks/useVehicleCategories';

interface CategoryCardProps {
  category: VehicleCategory;
  selected: boolean;
  onClick: () => void;
}

const iconMap: Record<string, any> = {
  Truck: Truck,
  TruckIcon: Truck,
  Car: Car,
  Bike: Bike,
  Container: Container,
};

export function CategoryCard({ category, selected, onClick }: CategoryCardProps) {
  const Icon = iconMap[category.icon_name || 'Truck'] || Truck;

  return (
    <Card
      className={cn(
        'p-6 cursor-pointer transition-all hover:shadow-md',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary'
          : 'border-border hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{category.display_name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {category.code} · {category.default_capacity_kg}kg
          </p>
        </div>
      </div>
    </Card>
  );
}
