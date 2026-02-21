import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Building2,
  BarChart3,
  Radar,
  MapPin,
  Gauge,
  Truck,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Integration } from '@/types/integration';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP = {
  Package,
  Building2,
  BarChart3,
  Radar,
  MapPin,
  Gauge,
  Truck,
};

interface ActiveIntegrationItemProps {
  integration: Integration;
  onConfigure?: (id: string) => void;
  onDisable?: (id: string) => void;
  onSync?: (id: string) => void;
}

export const ActiveIntegrationItem = memo(function ActiveIntegrationItem({
  integration,
  onConfigure,
  onDisable,
  onSync,
}: ActiveIntegrationItemProps) {
  const Icon = ICON_MAP[integration.icon as keyof typeof ICON_MAP] || Package;

  const getStatusBadge = () => {
    switch (integration.status) {
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'configured':
        return (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
            <Clock className="h-3 w-3 mr-1" />
            Configured
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-slate-500/10 text-slate-600">
            Inactive
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-accent/50 rounded-lg transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{integration.name}</h4>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground">{integration.description}</p>
          {integration.lastSync && (
            <p className="text-xs text-muted-foreground mt-1">
              Last sync: {formatDistanceToNow(new Date(integration.lastSync), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onConfigure?.(integration.id)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {integration.status === 'active' && (
              <DropdownMenuItem onClick={() => onSync?.(integration.id)}>
                Sync Now
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onConfigure?.(integration.id)}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDisable?.(integration.id)}
            >
              Disable
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
