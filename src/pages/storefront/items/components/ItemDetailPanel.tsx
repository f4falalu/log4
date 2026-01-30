import { format } from 'date-fns';
import { X, Edit, Package, Calendar, MapPin, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Item } from '@/types/items';
import { useItemAnalytics, useItemShipmentHistory } from '@/hooks/useItems';
import { ItemCategoryBadge } from './ItemCategoryBadge';

interface ItemDetailPanelProps {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
}

export function ItemDetailPanel({ item, onClose, onEdit }: ItemDetailPanelProps) {
  const { data: analytics } = useItemAnalytics(item.id);
  const { data: shipments = [] } = useItemShipmentHistory(item.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) <= new Date();
  };

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{item.description}</h2>
            <div className="flex items-center gap-2 mt-1">
              <ItemCategoryBadge category={item.category} />
              {item.stock_on_hand <= 10 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Low Stock
                </Badge>
              )}
              {isExpired(item.expiry_date) && (
                <Badge variant="destructive">Expired</Badge>
              )}
              {isExpiringSoon(item.expiry_date) && !isExpired(item.expiry_date) && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Expiring Soon
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="details" className="p-4 space-y-4 m-0">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Serial No." value={item.serial_number} />
                <InfoItem label="Unit Pack" value={item.unit_pack} />
                <InfoItem label="Batch No." value={item.batch_number} />
                <InfoItem label="Lot No." value={item.lot_number} />
              </div>
            </div>

            <Separator />

            {/* Measurements */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Measurements</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem
                  label="Weight"
                  value={item.weight_kg ? `${item.weight_kg.toFixed(2)} kg` : '-'}
                />
                <InfoItem
                  label="Volume"
                  value={item.volume_m3 ? `${item.volume_m3.toFixed(4)} m³` : '-'}
                />
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Dates</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Mfg. Date" value={formatDate(item.mfg_date)} icon={Calendar} />
                <InfoItem
                  label="Expiry Date"
                  value={formatDate(item.expiry_date)}
                  icon={Calendar}
                  valueClassName={cn(
                    isExpired(item.expiry_date) && 'text-red-600',
                    isExpiringSoon(item.expiry_date) && !isExpired(item.expiry_date) && 'text-orange-600'
                  )}
                />
              </div>
              {analytics?.days_until_expiry !== undefined && analytics.days_until_expiry > 0 && (
                <p className="text-xs text-muted-foreground">
                  {analytics.days_until_expiry} days until expiry
                </p>
              )}
            </div>

            <Separator />

            {/* Stock & Pricing */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Stock & Pricing</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem
                  label="Stock on Hand"
                  value={item.stock_on_hand.toString()}
                  icon={Package}
                  valueClassName={cn(
                    item.stock_on_hand <= 10 && 'text-orange-600',
                    item.stock_on_hand === 0 && 'text-red-600'
                  )}
                />
                <InfoItem label="Unit Price" value={formatCurrency(item.unit_price)} />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(item.total_price)}</p>
              </div>
            </div>

            <Separator />

            {/* Location */}
            {(item.store_address || item.warehouse) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Location</h3>
                {item.warehouse && (
                  <InfoItem label="Warehouse" value={item.warehouse.name} icon={MapPin} />
                )}
                {item.store_address && (
                  <InfoItem label="Store Address" value={item.store_address} />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="p-4 space-y-4 m-0">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Shipments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics?.total_shipments || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Qty Shipped
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analytics?.total_quantity_shipped || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Monthly Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">
                      {analytics?.average_monthly_usage?.toFixed(1) || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Days to Expiry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {analytics?.days_until_expiry !== undefined && analytics.days_until_expiry <= 30 && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                    <p className={cn(
                      'text-2xl font-bold',
                      analytics?.days_until_expiry !== undefined && analytics.days_until_expiry <= 30 && 'text-orange-600',
                      analytics?.days_until_expiry !== undefined && analytics.days_until_expiry <= 0 && 'text-red-600'
                    )}>
                      {analytics?.days_until_expiry ?? '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {analytics?.last_shipment_date && (
              <div className="text-sm text-muted-foreground">
                Last shipped: {formatDate(analytics.last_shipment_date)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-4 m-0">
            {shipments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No shipment history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="p-3 border rounded-lg space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {shipment.destination_facility?.name || 'Unknown'}
                      </span>
                      <Badge variant="outline">{shipment.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Qty: {shipment.quantity}</span>
                      <span>{formatDate(shipment.shipment_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t">
        <Button onClick={onEdit} className="w-full">
          <Edit className="h-4 w-4 mr-2" />
          Edit Item
        </Button>
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value?: string;
  icon?: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}

function InfoItem({ label, value, icon: Icon, valueClassName }: InfoItemProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <p className={cn('text-sm font-medium', valueClassName)}>{value || '-'}</p>
      </div>
    </div>
  );
}
