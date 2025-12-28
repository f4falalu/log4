import { Driver, DriverVehicleHistory } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverListItemProps {
  driver: Driver;
  vehicle?: DriverVehicleHistory;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const getStatusInfo = (status: Driver['status']) => {
  switch (status) {
    case 'busy':
      return { label: 'ON THE WAY', className: 'bg-success' };
    case 'available':
      return { label: 'WAITING', className: 'bg-warning' };
    case 'offline':
      return { label: 'OFFLINE', className: 'bg-muted' };
    default:
      return { label: 'LOADING', className: 'bg-warning' };
  }
};

export function DriverListItem({
  driver,
  vehicle,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: DriverListItemProps) {
  const statusInfo = getStatusInfo(driver.status);
  const initials = driver.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{driver.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {vehicle?.model || 'No vehicle assigned'}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="secondary"
            className={cn('text-[10px] px-1.5 py-0 h-5 text-white', statusInfo.className)}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <button
        onClick={onToggleFavorite}
        className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
      >
        <Star
          className={cn(
            'h-4 w-4',
            isFavorite ? 'fill-warning text-warning' : 'text-muted-foreground'
          )}
        />
      </button>
    </div>
  );
}
