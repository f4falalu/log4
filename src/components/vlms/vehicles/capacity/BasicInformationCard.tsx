import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { VehicleWithRelations } from '@/types/vlms';

interface BasicInformationCardProps {
  vehicle: VehicleWithRelations;
}

export function BasicInformationCard({ vehicle }: BasicInformationCardProps) {
  // Try to get vehicle image from photos array or use placeholder
  const vehicleImage = vehicle.photos && vehicle.photos.length > 0
    ? vehicle.photos[0]?.url
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Vehicle Image */}
          <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {vehicleImage ? (
              <img
                src={vehicleImage}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <svg
                  className="w-24 h-24 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                  />
                </svg>
                <p className="text-sm">No vehicle image</p>
              </div>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Make</span>
              <span className="font-medium">{vehicle.make || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">{vehicle.model || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Year</span>
              <span className="font-medium">{vehicle.year || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">License Plate</span>
              <span className="font-medium">{vehicle.license_plate || 'N/A'}</span>
            </div>
            {vehicle.vin && (
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">VIN</span>
                <span className="font-medium text-xs">{vehicle.vin}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
