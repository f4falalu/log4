import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { VehicleIllustration } from '@/components/vehicle/VehicleIllustration';
import { DriverVehicleHistory } from '@/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface DriverVehicleCarouselProps {
  vehicles: DriverVehicleHistory[];
}

export function DriverVehicleCarousel({ vehicles }: DriverVehicleCarouselProps) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No vehicles assigned yet</p>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Carousel className="w-full">
        <CarouselContent>
          {vehicles.map((vehicle) => (
            <CarouselItem key={vehicle.vehicleId}>
              <Card className="p-6">
                {/* Vehicle Image */}
                <div className="mb-6">
                  {vehicle.photoUrl ? (
                    <div className="relative w-full aspect-[16/9] bg-muted/30 rounded-lg overflow-hidden">
                      <img
                        src={vehicle.photoUrl}
                        alt={`${vehicle.plateNumber} - ${vehicle.model}`}
                        className="w-full h-full object-contain p-2"
                      />
                      {vehicle.aiGenerated && (
                        <Badge className="absolute top-2 right-2" variant="secondary">
                          ✨ AI
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-[16/9] bg-muted/30 rounded-lg flex items-center justify-center p-4">
                      <VehicleIllustration 
                        type={vehicle.type.toLowerCase() as any}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>

                {/* Vehicle Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Plate Number</p>
                      <p className="font-semibold">{vehicle.plateNumber}</p>
                    </div>
                    {vehicle.isCurrent && (
                      <Badge variant="default">Current Assignment</Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-semibold">{vehicle.model}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{vehicle.type}</p>
                  </div>

                  {/* Vehicle Specs Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Payload</p>
                      <p className="font-semibold">{vehicle.capacity} m³</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fuel Type</p>
                      <p className="font-semibold capitalize">{vehicle.fuelType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Speed</p>
                      <p className="font-semibold">{vehicle.avgSpeed} km/h</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Trips</p>
                      <p className="font-semibold">{vehicle.totalTrips}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Assigned: {new Date(vehicle.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {vehicles.length > 1 && (
          <>
            <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2" />
          </>
        )}
      </Carousel>

      {/* Vehicle count indicator */}
      {vehicles.length > 1 && (
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} assigned
          </p>
        </div>
      )}
    </div>
  );
}
