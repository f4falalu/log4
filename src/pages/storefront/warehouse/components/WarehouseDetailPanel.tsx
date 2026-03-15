import { format } from 'date-fns';
import { X, Edit, MapPin, Phone, Mail, Clock, Package, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Warehouse } from '@/types/warehouse';
import { STORAGE_ZONE_TYPES } from '@/types/warehouse';
import { useWarehouseInventory } from '@/hooks/useWarehouses';

interface WarehouseDetailPanelProps {
  warehouse: Warehouse;
  onClose: () => void;
  onEdit: () => void;
}

export function WarehouseDetailPanel({ warehouse, onClose, onEdit }: WarehouseDetailPanelProps) {
  const { data: inventoryData } = useWarehouseInventory(warehouse.id);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const getUtilization = () => {
    if (!warehouse.total_capacity_m3 || warehouse.total_capacity_m3 === 0) return 0;
    return ((warehouse.used_capacity_m3 || 0) / warehouse.total_capacity_m3) * 100;
  };

  const utilization = getUtilization();
  const usedCapacity = warehouse.used_capacity_m3 || 0;
  const totalCapacity = warehouse.total_capacity_m3 || 0;
  const availableCapacity = totalCapacity - usedCapacity;

  const getUtilizationColor = (pct: number) => {
    if (pct > 80) return { text: 'text-red-600', bar: '[&>div]:bg-red-500', bg: 'bg-red-50', label: 'Congested' };
    if (pct > 50) return { text: 'text-amber-600', bar: '[&>div]:bg-amber-500', bg: 'bg-amber-50', label: 'Monitor' };
    return { text: 'text-green-600', bar: '[&>div]:bg-green-500', bg: 'bg-green-50', label: 'Available' };
  };

  const colorConfig = getUtilizationColor(utilization);

  const getZoneTypeConfig = (type: string) => {
    return STORAGE_ZONE_TYPES.find(z => z.value === type) || STORAGE_ZONE_TYPES[4];
  };

  // Placeholder supply flow data (replace with real data when available)
  const inbound = 0;
  const outbound = 0;
  const netFlow = inbound - outbound;

  return (
    <div className="w-[340px] shrink-0 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{warehouse.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono">{warehouse.code}</Badge>
              <Badge
                variant={warehouse.is_active ? 'default' : 'secondary'}
                className={warehouse.is_active ? 'bg-green-100 text-green-800' : ''}
              >
                {warehouse.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Capacity Utilization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Capacity Utilization</h3>
              <Badge variant="outline" className={cn('text-xs', colorConfig.text, colorConfig.bg)}>
                {colorConfig.label}
              </Badge>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-baseline justify-between">
                <span className={cn('text-3xl font-bold tabular-nums', colorConfig.text)}>
                  {utilization.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  of {totalCapacity.toLocaleString()} m³
                </span>
              </div>
              <Progress
                value={utilization}
                className={cn('h-3 rounded-full', colorConfig.bar)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-background rounded-md border">
                  <p className="text-xs text-muted-foreground">Used</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {usedCapacity.toLocaleString()} m³
                  </p>
                </div>
                <div className="p-2.5 bg-background rounded-md border">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-sm font-semibold tabular-nums text-green-600">
                    {availableCapacity.toLocaleString()} m³
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Supply Flow */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Supply Flow (Today)</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-muted/50 rounded-md text-center">
                <ArrowDownRight className="h-3.5 w-3.5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Inbound</p>
                <p className="text-sm font-semibold tabular-nums">{inbound.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-md text-center">
                <ArrowUpRight className="h-3.5 w-3.5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Outbound</p>
                <p className="text-sm font-semibold tabular-nums">{outbound.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-md text-center">
                <Activity className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Net</p>
                <p className={cn(
                  'text-sm font-semibold tabular-nums',
                  netFlow > 0 && 'text-blue-600',
                  netFlow < 0 && 'text-orange-600'
                )}>
                  {netFlow > 0 ? '+' : ''}{netFlow.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Storage Zones */}
          {warehouse.storage_zones && warehouse.storage_zones.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Zone Distribution</h3>
                <div className="space-y-2">
                  {warehouse.storage_zones.map((zone, index) => {
                    const config = getZoneTypeConfig(zone.type);
                    const zoneUtilization = zone.capacity_m3 > 0
                      ? (zone.used_m3 / zone.capacity_m3) * 100
                      : 0;
                    const zoneColor = getUtilizationColor(zoneUtilization);

                    return (
                      <div key={zone.id || index} className="p-2.5 border rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Badge className={cn('font-normal text-xs px-1.5 py-0', config.color)}>
                              {config.label}
                            </Badge>
                            <span className="text-xs font-medium truncate">{zone.name}</span>
                          </div>
                          <span className={cn('text-xs font-semibold tabular-nums', zoneColor.text)}>
                            {zoneUtilization.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={zoneUtilization} className={cn('h-1.5', zoneColor.bar)} />
                        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                          <span>{zone.used_m3.toLocaleString()} / {zone.capacity_m3.toLocaleString()} m³</span>
                          {zone.temp_range && <span>{zone.temp_range}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Location</h3>
            {warehouse.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm">{warehouse.address}</p>
                  {(warehouse.city || warehouse.state) && (
                    <p className="text-sm text-muted-foreground">
                      {[warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
            {warehouse.lat && warehouse.lng && (
              <p className="text-xs text-muted-foreground font-mono">
                {warehouse.lat.toFixed(6)}, {warehouse.lng.toFixed(6)}
              </p>
            )}
          </div>

          <Separator />

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Contact</h3>
            {warehouse.contact_name && (
              <p className="text-sm font-medium">{warehouse.contact_name}</p>
            )}
            {warehouse.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{warehouse.contact_phone}</span>
              </div>
            )}
            {warehouse.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{warehouse.contact_email}</span>
              </div>
            )}
            {warehouse.operating_hours && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{warehouse.operating_hours}</span>
              </div>
            )}
            {!warehouse.contact_name && !warehouse.contact_phone && !warehouse.contact_email && (
              <p className="text-sm text-muted-foreground">No contact information</p>
            )}
          </div>

          {/* Inventory Summary */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Inventory</h3>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items in Warehouse</p>
                  <p className="text-lg font-bold tabular-nums">{inventoryData?.total || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dates */}
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p>{formatDate(warehouse.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p>{formatDate(warehouse.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t">
        <Button onClick={onEdit} className="w-full">
          <Edit className="h-4 w-4 mr-2" />
          Edit Warehouse
        </Button>
      </div>
    </div>
  );
}
