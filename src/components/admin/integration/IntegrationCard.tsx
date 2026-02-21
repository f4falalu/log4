import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Building2,
  BarChart3,
  Radar,
  MapPin,
  Gauge,
  Truck,
  Plus,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AvailableIntegration, Integration } from '@/types/integration';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  Package,
  Building2,
  BarChart3,
  Radar,
  MapPin,
  Gauge,
  Truck,
};

interface IntegrationCardProps {
  integration: AvailableIntegration;
  isActive?: boolean;
  activeIntegration?: Integration;
  onConfigure?: (type: string) => void;
}

export const IntegrationCard = memo(function IntegrationCard({
  integration,
  isActive,
  activeIntegration,
  onConfigure,
}: IntegrationCardProps) {
  const Icon = ICON_MAP[integration.icon as keyof typeof ICON_MAP] || Package;

  const getStatusBadge = () => {
    if (integration.comingSoon) {
      return (
        <Badge variant="secondary" className="bg-slate-500/10 text-slate-600">
          Coming Soon
        </Badge>
      );
    }
    if (integration.isNew) {
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
          New
        </Badge>
      );
    }
    if (isActive && activeIntegration) {
      if (activeIntegration.status === 'active') {
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      }
      if (activeIntegration.status === 'error') {
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      }
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
          Configured
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className={cn(isActive && 'border-primary')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          {getStatusBadge()}
        </div>

        <h3 className="font-semibold text-lg mb-2">{integration.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
          {integration.description}
        </p>

        <div className="space-y-2 mb-4">
          {integration.capabilities.slice(0, 3).map((capability, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span className="text-muted-foreground">{capability}</span>
            </div>
          ))}
        </div>

        {!integration.comingSoon && (
          <Button
            variant={isActive ? 'outline' : 'default'}
            className="w-full"
            onClick={() => onConfigure?.(integration.type)}
          >
            {isActive ? (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
