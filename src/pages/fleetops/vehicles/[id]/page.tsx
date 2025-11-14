import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehicleTiers } from '@/hooks/useVehicleTiers';
import { TierVisualizer } from '@/components/vehicle/TierVisualizer';
import { ArrowLeft, Edit, Truck, History, Settings } from 'lucide-react';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tiers = [] } = useVehicleTiers(id);
  const vehicleWithExtras = vehicle as any;

  const { data: category } = useQuery({
    queryKey: ['vehicle-category', vehicleWithExtras?.category_id],
    queryFn: async () => {
      if (!vehicleWithExtras?.category_id) return null;
      const { data, error } = await supabase
        .from('vehicle_categories' as any)
        .select('*')
        .eq('id', vehicleWithExtras.category_id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!vehicleWithExtras?.category_id,
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading vehicle details...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Vehicle not found</p>
          <Button onClick={() => navigate('/fleetops/vehicles')}>
            Back to Registry
          </Button>
        </div>
      </div>
    );
  }

  const tierData = tiers.map(t => ({
    name: t.tier_name,
    ratio: t.weight_ratio,
    capacity_kg: t.max_weight_kg,
  }));

  return (
    <div className="h-full bg-background p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/fleetops/vehicles')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{vehicle.model}</h1>
              <p className="text-muted-foreground">{vehicle.plate_number}</p>
            </div>
            <Badge variant={
              vehicle.status === 'available' ? 'default' :
              vehicle.status === 'in-use' ? 'secondary' : 'outline'
            }>
              {vehicle.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Vehicle
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="capacity">Capacity & Tiers</TabsTrigger>
            <TabsTrigger value="history">Usage History</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {category?.display_name || vehicle.type}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vehicleWithExtras.subcategory || 'Standard'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{vehicle.capacity} kg</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {vehicle.max_weight} kg
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Fuel Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vehicle.fuel_efficiency} km/L
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vehicle.fuel_type}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Speed</p>
                    <p className="font-medium">{vehicle.avg_speed} km/h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Daily Distance</p>
                    <p className="font-medium">{vehicleWithExtras.max_daily_distance || 'N/A'} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Maintenance Frequency</p>
                    <p className="font-medium">
                      Every {vehicleWithExtras.maintenance_frequency_km || 'N/A'} km
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Maintenance</p>
                    <p className="font-medium">
                      {vehicleWithExtras.next_maintenance_date 
                        ? new Date(vehicleWithExtras.next_maintenance_date).toLocaleDateString()
                        : 'Not scheduled'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capacity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tier Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {tiers.length > 0 ? (
                  <>
                    <TierVisualizer 
                      tiers={tierData}
                      totalCapacity={vehicle.capacity}
                    />
                    <div className="mt-6 space-y-2">
                      {tiers.map((tier) => (
                        <div
                          key={tier.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{tier.tier_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Position {tier.tier_position}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{tier.max_weight_kg} kg</p>
                            <p className="text-sm text-muted-foreground">
                              {tier.weight_ratio}% of total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tier configuration available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Usage History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No usage history available</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No maintenance records available</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Loading Planner Dialog - Requires batch context */}
      {/* TODO: Integrate with batch selection or creation flow */}
    </div>
  );
}
