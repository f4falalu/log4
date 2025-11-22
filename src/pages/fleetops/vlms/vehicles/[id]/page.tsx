import { useParams, useNavigate } from 'react-router-dom';
import { useVehicle } from '@/hooks/vlms/useVehicles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Loader2, Car, FileText, Image as ImageIcon } from 'lucide-react';

export default function VehicleDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const vehicleId = params.id as string;

  const { data: vehicle, isLoading } = useVehicle(vehicleId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p>Vehicle not found</p>
        <Button onClick={() => navigate('/fleetops/vlms/vehicles')} className="mt-4">
          Back to Vehicles
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      available: { variant: 'default', label: 'Available' },
      in_use: { variant: 'secondary', label: 'In Use' },
      maintenance: { variant: 'outline', label: 'Maintenance' },
      out_of_service: { variant: 'destructive', label: 'Out of Service' },
      disposed: { variant: 'outline', label: 'Disposed' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {vehicle.make} {vehicle.model}
              </h1>
              {getStatusBadge(vehicle.status)}
            </div>
            <p className="text-muted-foreground">
              {vehicle.vehicle_id} • {vehicle.license_plate}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/fleetops/vlms/vehicles/${vehicle.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Vehicle
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Mileage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicle.current_mileage?.toLocaleString()} km</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Maintenance Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${vehicle.total_maintenance_cost?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${vehicle.current_book_value?.toLocaleString() || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicle.next_service_date
                ? new Date(vehicle.next_service_date).toLocaleDateString()
                : 'Not scheduled'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Car className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="photos">
            <ImageIcon className="h-4 w-4 mr-2" />
            Photos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Make</div>
                  <div className="font-medium">{vehicle.make}</div>

                  <div className="text-muted-foreground">Model</div>
                  <div className="font-medium">{vehicle.model}</div>

                  <div className="text-muted-foreground">Year</div>
                  <div className="font-medium">{vehicle.year}</div>

                  <div className="text-muted-foreground">VIN</div>
                  <div className="font-medium">{vehicle.vin || 'N/A'}</div>

                  <div className="text-muted-foreground">License Plate</div>
                  <div className="font-medium">{vehicle.license_plate}</div>

                  <div className="text-muted-foreground">Type</div>
                  <div className="font-medium capitalize">
                    {vehicle.type?.replace('_', ' ') || '-'}
                  </div>

                  <div className="text-muted-foreground">Fuel Type</div>
                  <div className="font-medium capitalize">{vehicle.fuel_type}</div>

                  <div className="text-muted-foreground">Transmission</div>
                  <div className="font-medium capitalize">{vehicle.transmission || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Engine Capacity</div>
                  <div className="font-medium">
                    {vehicle.engine_capacity ? `${vehicle.engine_capacity} L` : 'N/A'}
                  </div>

                  <div className="text-muted-foreground">Color</div>
                  <div className="font-medium">{vehicle.color || 'N/A'}</div>

                  <div className="text-muted-foreground">Seating Capacity</div>
                  <div className="font-medium">
                    {vehicle.seating_capacity ? `${vehicle.seating_capacity} seats` : 'N/A'}
                  </div>

                  <div className="text-muted-foreground">Cargo Capacity</div>
                  <div className="font-medium">
                    {vehicle.cargo_capacity ? `${vehicle.cargo_capacity} m³` : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acquisition Info */}
            <Card>
              <CardHeader>
                <CardTitle>Acquisition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Acquisition Date</div>
                  <div className="font-medium">
                    {new Date(vehicle.acquisition_date).toLocaleDateString()}
                  </div>

                  <div className="text-muted-foreground">Acquisition Type</div>
                  <div className="font-medium capitalize">
                    {vehicle.acquisition_type.replace('_', ' ')}
                  </div>

                  <div className="text-muted-foreground">Purchase Price</div>
                  <div className="font-medium">
                    {vehicle.purchase_price ? `$${vehicle.purchase_price.toLocaleString()}` : 'N/A'}
                  </div>

                  <div className="text-muted-foreground">Vendor</div>
                  <div className="font-medium">{vehicle.vendor_name || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Insurance & Registration */}
            <Card>
              <CardHeader>
                <CardTitle>Insurance & Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Insurance Provider</div>
                  <div className="font-medium">{vehicle.insurance_provider || 'N/A'}</div>

                  <div className="text-muted-foreground">Policy Number</div>
                  <div className="font-medium">{vehicle.insurance_policy_number || 'N/A'}</div>

                  <div className="text-muted-foreground">Insurance Expiry</div>
                  <div className="font-medium">
                    {vehicle.insurance_expiry
                      ? new Date(vehicle.insurance_expiry).toLocaleDateString()
                      : 'N/A'}
                  </div>

                  <div className="text-muted-foreground">Registration Expiry</div>
                  <div className="font-medium">
                    {vehicle.registration_expiry
                      ? new Date(vehicle.registration_expiry).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {vehicle.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{vehicle.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.documents && Array.isArray(vehicle.documents) && vehicle.documents.length > 0 ? (
                <div className="space-y-2">
                  {vehicle.documents.map((doc: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-muted-foreground">{doc.type}</div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.photos && Array.isArray(vehicle.photos) && vehicle.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {vehicle.photos.map((photo: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Vehicle photo'}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {photo.caption && (
                        <p className="text-sm text-muted-foreground">{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No photos uploaded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
