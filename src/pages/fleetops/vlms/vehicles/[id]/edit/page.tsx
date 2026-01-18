import { useParams, useNavigate } from 'react-router-dom';
import { useVehicle, useUpdateVehicle } from '@/hooks/vlms/useVehicles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VehicleForm } from '@/components/vlms/vehicles/VehicleForm';
import { VehicleFormData } from '@/lib/vlms/validationSchemas';

export default function VehicleEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const vehicleId = params.id as string;

  const { data: vehicle, isLoading } = useVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle();

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

  const handleSubmit = async (data: VehicleFormData) => {
    await updateVehicle.mutateAsync({
      id: vehicleId,
      data,
    });
    navigate(`/fleetops/vlms/vehicles/${vehicleId}`);
  };

  const handleCancel = () => {
    navigate(`/fleetops/vlms/vehicles/${vehicleId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/fleetops/vlms/vehicles/${vehicleId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Vehicle</h1>
          <p className="text-muted-foreground">
            Update vehicle information for {vehicle.make} {vehicle.model}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm
            vehicle={vehicle}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={updateVehicle.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
