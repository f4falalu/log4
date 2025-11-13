import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehicleWizard } from '@/hooks/useVehicleWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Car } from 'lucide-react';
import { Step1CategorySelect } from '@/components/vehicle/wizard/Step1CategorySelect';
import { Step2CapacityConfig } from '@/components/vehicle/wizard/Step2CapacityConfig';
import { Step3OperationalConfig } from '@/components/vehicle/wizard/Step3OperationalConfig';
import { Step4Review } from '@/components/vehicle/wizard/Step4Review';

const stepTitles = {
  1: 'Select Vehicle Category',
  2: 'Configure Capacity & Tiers',
  3: 'Operational Specifications',
  4: 'Review & Confirm'
};

export default function VehicleRegistry() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { currentStep, reset } = useVehicleWizard();
  const { data: vehicles = [], isLoading } = useVehicles();
  const navigate = useNavigate();

  const handleOpenWizard = () => {
    reset();
    setWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setWizardOpen(false);
    reset();
  };

  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vehicle Registry</h1>
            <p className="text-muted-foreground mt-1">
              Manage your fleet vehicles and their configurations
            </p>
          </div>
          <Button onClick={handleOpenWizard}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicles.filter(v => v.status === 'available').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicles.filter(v => v.status === 'in-use').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vehicles.filter(v => v.status === 'maintenance').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle List */}
        <Card>
          <CardHeader>
            <CardTitle>All Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading vehicles...
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No vehicles in registry</p>
                <Button onClick={handleOpenWizard} className="mt-4">
                  Add Your First Vehicle
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/fleetops/vehicles/${vehicle.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.plateNumber} · {vehicle.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{vehicle.capacity} kg</p>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                      </div>
                      <Badge variant={
                        vehicle.status === 'available' ? 'default' :
                        vehicle.status === 'in-use' ? 'secondary' : 'outline'
                      }>
                        {vehicle.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{stepTitles[currentStep as keyof typeof stepTitles]}</DialogTitle>
          </DialogHeader>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-1 rounded-full ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 1 && <Step1CategorySelect />}
          {currentStep === 2 && <Step2CapacityConfig />}
          {currentStep === 3 && <Step3OperationalConfig />}
          {currentStep === 4 && <Step4Review onComplete={handleCloseWizard} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
