import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssignmentsStore } from '@/stores/vlms/assignmentsStore';
import { useVehicles } from '@/hooks/vlms/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useFacilities } from '@/hooks/useFacilities';
import { AssignmentFormData, AssignmentType } from '@/types/vlms';

interface CreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAssignmentDialog({ open, onOpenChange }: CreateAssignmentDialogProps) {
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const { data: facilities = [] } = useFacilities();
  const { createAssignment, isLoading } = useAssignmentsStore();

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('temporary');
  const [assignedToId, setAssignedToId] = useState('');
  const [assignedLocationId, setAssignedLocationId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [projectName, setProjectName] = useState('');
  const [authorizationNumber, setAuthorizationNumber] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [fuelLevelStart, setFuelLevelStart] = useState('');
  const [conditionStart, setConditionStart] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId || !startDate || !purpose.trim()) {
      return;
    }

    // Validate that either driver or location is assigned
    if (!assignedToId && !assignedLocationId) {
      return;
    }

    const formData: AssignmentFormData = {
      vehicle_id: vehicleId,
      assignment_type: assignmentType,
      start_date: startDate,
      purpose,
      assigned_to_id: assignedToId || undefined,
      assigned_location_id: assignedLocationId || undefined,
      end_date: endDate || undefined,
      project_name: projectName || undefined,
      authorization_number: authorizationNumber || undefined,
      odometer_start: odometerStart ? parseInt(odometerStart) : undefined,
      fuel_level_start: fuelLevelStart ? parseFloat(fuelLevelStart) : undefined,
      condition_start: conditionStart || undefined,
      notes: notes || undefined,
    };

    try {
      await createAssignment(formData);
      onOpenChange(false);

      // Reset form
      setVehicleId('');
      setAssignmentType('temporary');
      setAssignedToId('');
      setAssignedLocationId('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setPurpose('');
      setProjectName('');
      setAuthorizationNumber('');
      setOdometerStart('');
      setFuelLevelStart('');
      setConditionStart('');
      setNotes('');
    } catch (error) {
      // Error is handled by the store with toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Vehicle Assignment</DialogTitle>
          <DialogDescription>
            Assign a vehicle to a driver or location
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} - {vehicle.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="assignment-type">Assignment Type *</Label>
              <Select
                value={assignmentType}
                onValueChange={(value: any) => setAssignmentType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent Assignment</SelectItem>
                  <SelectItem value="temporary">Temporary Assignment</SelectItem>
                  <SelectItem value="pool">Pool Vehicle</SelectItem>
                  <SelectItem value="project">Project Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="driver">Assign to Driver</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="location">Assign to Location/Facility</Label>
              <Select value={assignedLocationId} onValueChange={setAssignedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe the purpose of this assignment..."
                rows={3}
              />
            </div>

            {assignmentType === 'project' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Vaccine Distribution Q1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-number">Authorization Number</Label>
                  <Input
                    id="auth-number"
                    value={authorizationNumber}
                    onChange={(e) => setAuthorizationNumber(e.target.value)}
                    placeholder="e.g., AUTH-2024-001"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="odometer-start">Starting Odometer (km)</Label>
              <Input
                id="odometer-start"
                type="number"
                min="0"
                value={odometerStart}
                onChange={(e) => setOdometerStart(e.target.value)}
                placeholder="e.g., 45000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-level">Starting Fuel Level (%)</Label>
              <Input
                id="fuel-level"
                type="number"
                min="0"
                max="100"
                value={fuelLevelStart}
                onChange={(e) => setFuelLevelStart(e.target.value)}
                placeholder="e.g., 75"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="condition">Vehicle Condition at Start</Label>
              <Textarea
                id="condition"
                value={conditionStart}
                onChange={(e) => setConditionStart(e.target.value)}
                placeholder="Note any damage or issues with the vehicle..."
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information about this assignment..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !vehicleId ||
                !startDate ||
                !purpose.trim() ||
                (!assignedToId && !assignedLocationId) ||
                isLoading
              }
            >
              {isLoading ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
