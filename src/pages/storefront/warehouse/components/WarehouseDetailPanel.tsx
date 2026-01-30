import { format } from 'date-fns';
import { X, Edit, MapPin, Phone, Mail, Clock, Package, Warehouse as WarehouseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const getZoneTypeConfig = (type: string) => {
    return STORAGE_ZONE_TYPES.find(z => z.value === type) || STORAGE_ZONE_TYPES[4];
  };

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">{warehouse.name}</h2>
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
          {/* Capacity Overview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Capacity</h3>
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Utilization</span>
                <span className={cn(
                  'text-lg font-bold',
                  utilization > 90 && 'text-red-600',
                  utilization > 70 && utilization <= 90 && 'text-yellow-600'
                )}>
                  {utilization.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={utilization}
                className={cn(
                  'h-3',
                  utilization > 90 && '[&>div]:bg-red-500',
                  utilization > 70 && utilization <= 90 && '[&>div]:bg-yellow-500'
                )}
              />
              <div className="flex items-center justify-between text-sm">
                <span>{(warehouse.used_capacity_m3 || 0).toLocaleString()} m³ used</span>
                <span>{(warehouse.total_capacity_m3 || 0).toLocaleString()} m³ total</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Location</h3>
            {warehouse.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
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

          {/* Storage Zones */}
          {warehouse.storage_zones && warehouse.storage_zones.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Storage Zones</h3>
                <div className="space-y-2">
                  {warehouse.storage_zones.map((zone, index) => {
                    const config = getZoneTypeConfig(zone.type);
                    const zoneUtilization = zone.capacity_m3 > 0
                      ? (zone.used_m3 / zone.capacity_m3) * 100
                      : 0;

                    return (
                      <div key={zone.id || index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={cn('font-normal', config.color)}>
                              {config.label}
                            </Badge>
                            <span className="text-sm font-medium">{zone.name}</span>
                          </div>
                          {zone.temp_range && (
                            <span className="text-xs text-muted-foreground">{zone.temp_range}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{zoneUtilization.toFixed(0)}%</span>
                            <span className="text-muted-foreground">
                              {zone.used_m3} / {zone.capacity_m3} m³
                            </span>
                          </div>
                          <Progress value={zoneUtilization} className="h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Inventory Summary */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Inventory</h3>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items in Warehouse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{inventoryData?.total || 0}</p>
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
