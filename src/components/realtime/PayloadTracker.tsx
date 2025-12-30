import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Truck, Package, MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PayloadTrackerProps {
  batchId: string;
  vehicleId: string;
}

interface PayloadStatus {
  id: string;
  batch_id: string;
  vehicle_id: string;
  current_location_lat?: number;
  current_location_lng?: number;
  payload_utilization_pct: number;
  estimated_arrival: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
  last_updated: string;
}

interface PayloadItem {
  id: string;
  facility_name: string;
  box_type: string;
  quantity: number;
  volume_m3: number;
  weight_kg: number;
  status: 'pending' | 'loaded' | 'delivered';
}

export function PayloadTracker({ batchId, vehicleId }: PayloadTrackerProps) {
  const [payloadStatus, setPayloadStatus] = useState<PayloadStatus | null>(null);
  const [payloadItems, setPayloadItems] = useState<PayloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial data fetch
    fetchPayloadData();

    // Set up real-time subscription for payload updates
    const channel = supabase
      .channel(`payload_tracking_${batchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches',
          filter: `id=eq.${batchId}`,
        },
        (payload) => {
          fetchPayloadData();
          
          if (payload.eventType === 'UPDATE') {
            toast.info('Payload status updated', {
              description: 'Real-time update received'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payload_items',
          filter: `batch_id=eq.${batchId}`,
        },
        (payload) => {
          fetchPayloadItems();
          
          if (payload.eventType === 'UPDATE') {
            toast.info('Payload item status updated');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [batchId]);

  const fetchPayloadData = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('delivery_batches')
        .select(`
          *,
          vehicles(model, plate_number)
        `)
        .eq('id', batchId)
        .single();

      if (error) throw error;

      setPayloadStatus({
        id: data.id,
        batch_id: data.id,
        vehicle_id: data.vehicle_id,
        current_location_lat: data.current_location_lat,
        current_location_lng: data.current_location_lng,
        payload_utilization_pct: data.payload_utilization_pct || 0,
        estimated_arrival: data.estimated_end_time,
        status: data.status,
        last_updated: data.updated_at || data.created_at
      });
    } catch (error) {
      console.error('Error fetching payload data:', error);
      toast.error('Failed to fetch payload data');
    }
  };

  const fetchPayloadItems = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('payload_items')
        .select(`
          *,
          facility:facilities(name)
        `)
        .eq('batch_id', batchId);

      if (error) throw error;

      setPayloadItems(data.map((item: any) => ({
        id: item.id,
        facility_name: item.facility?.name || 'Unknown Facility',
        box_type: item.box_type,
        quantity: item.quantity,
        volume_m3: item.volume_m3,
        weight_kg: item.weight_kg,
        status: item.status
      })));
    } catch (error) {
      console.error('Error fetching payload items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'in_transit': return 'bg-primary/10 text-primary border-primary/20';
      case 'delivered': return 'bg-success/10 text-success border-success/20';
      case 'delayed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'loaded': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted/30 text-muted-foreground border-muted/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'delayed': return <AlertTriangle className="h-4 w-4" />;
      case 'loaded': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Loading payload tracking data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payloadStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Payload tracking data not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payload Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Real-Time Payload Tracking
          </CardTitle>
          <CardDescription>
            Live updates for batch {batchId.slice(0, 8)}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(payloadStatus.status)}
                <span className="font-medium">Status</span>
              </div>
              <Badge className={getStatusColor(payloadStatus.status)}>
                {payloadStatus.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="font-medium">Payload Utilization</span>
              </div>
              <div className="space-y-1">
                <Progress value={payloadStatus.payload_utilization_pct} className="h-2" />
                <span className="text-sm text-muted-foreground">
                  {payloadStatus.payload_utilization_pct.toFixed(1)}% capacity used
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Last Updated</span>
              </div>
              <span className="text-sm">
                {new Date(payloadStatus.last_updated).toLocaleString()}
              </span>
            </div>
          </div>

          {payloadStatus.current_location_lat && payloadStatus.current_location_lng && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                Current Location: {payloadStatus.current_location_lat.toFixed(4)}, {payloadStatus.current_location_lng.toFixed(4)}
              </span>
              <Button variant="outline" size="sm" className="ml-auto">
                View on Map
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload Items Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Payload Items ({payloadItems.length})
          </CardTitle>
          <CardDescription>
            Individual item tracking and status updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payloadItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payload items found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payloadItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.facility_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.box_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} items • {item.volume_m3.toFixed(3)}m³ • {item.weight_kg}kg
                    </div>
                  </div>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
