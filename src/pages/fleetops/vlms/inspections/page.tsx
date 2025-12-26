import { useState } from 'react';
import { useInspections, useCreateInspection, useDeleteInspection, type VlmsInspection, type InspectionFormData } from '@/hooks/useInspections';
import { useVehicles } from '@/hooks/useVehicles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Plus,
  Search,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';

const INSPECTION_TYPES = [
  { value: 'routine', label: 'Routine Inspection' },
  { value: 'pre_trip', label: 'Pre-Trip Inspection' },
  { value: 'post_trip', label: 'Post-Trip Inspection' },
  { value: 'safety', label: 'Safety Inspection' },
  { value: 'compliance', label: 'Compliance Inspection' },
  { value: 'damage_assessment', label: 'Damage Assessment' },
];

const STATUS_CONFIG = {
  passed: { icon: CheckCircle, color: 'bg-green-500', label: 'Passed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  conditional: { icon: AlertTriangle, color: 'bg-yellow-500', label: 'Conditional' },
  pending: { icon: Clock, color: 'bg-gray-500', label: 'Pending' },
};

const DEFAULT_CHECKLIST_ITEMS = [
  'Brakes',
  'Tires',
  'Lights',
  'Signals',
  'Horn',
  'Mirrors',
  'Windshield',
  'Wipers',
  'Seatbelts',
  'Fire Extinguisher',
  'First Aid Kit',
  'Warning Triangle',
  'Fluid Levels',
  'Battery',
  'Engine',
];

function CreateInspectionDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InspectionFormData>>({
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'routine',
    overall_status: 'pending',
    checklist: {},
    reinspection_required: false,
    meets_safety_standards: true,
    roadworthy: true,
    defects_found: [],
    priority_repairs: [],
  });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const { data: vehicles } = useVlmsVehicles();
  const createMutation = useCreateInspection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicle_id || !formData.inspector_name) {
      return;
    }

    await createMutation.mutateAsync({
      vehicle_id: formData.vehicle_id,
      inspection_date: formData.inspection_date!,
      inspection_type: formData.inspection_type as any,
      inspector_name: formData.inspector_name,
      inspector_certification: formData.inspector_certification,
      odometer_reading: formData.odometer_reading,
      overall_status: formData.overall_status as any,
      checklist,
      defects_found: formData.defects_found,
      priority_repairs: formData.priority_repairs,
      repair_recommendations: formData.repair_recommendations,
      estimated_repair_cost: formData.estimated_repair_cost,
      repair_deadline: formData.repair_deadline,
      next_inspection_date: formData.next_inspection_date,
      reinspection_required: formData.reinspection_required!,
      meets_safety_standards: formData.meets_safety_standards!,
      roadworthy: formData.roadworthy!,
      notes: formData.notes,
    });

    setOpen(false);
    setFormData({
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_type: 'routine',
      overall_status: 'pending',
      checklist: {},
      reinspection_required: false,
      meets_safety_standards: true,
      roadworthy: true,
      defects_found: [],
      priority_repairs: [],
    });
    setChecklist({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Inspection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Vehicle Inspection</DialogTitle>
          <DialogDescription>
            Record a new vehicle inspection with detailed checklist
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle *</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_id} - {vehicle.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection_type">Inspection Type *</Label>
              <Select
                value={formData.inspection_type}
                onValueChange={(value) => setFormData({ ...formData, inspection_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection_date">Inspection Date *</Label>
              <Input
                id="inspection_date"
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometer_reading">Odometer Reading (km)</Label>
              <Input
                id="odometer_reading"
                type="number"
                step="0.01"
                value={formData.odometer_reading || ''}
                onChange={(e) => setFormData({ ...formData, odometer_reading: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Inspector Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector Name *</Label>
              <Input
                id="inspector_name"
                value={formData.inspector_name || ''}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector_certification">Certification Number</Label>
              <Input
                id="inspector_certification"
                value={formData.inspector_certification || ''}
                onChange={(e) => setFormData({ ...formData, inspector_certification: e.target.value })}
              />
            </div>
          </div>

          {/* Inspection Checklist */}
          <div className="space-y-3">
            <Label>Inspection Checklist</Label>
            <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg">
              {DEFAULT_CHECKLIST_ITEMS.map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={item}
                    checked={checklist[item] || false}
                    onCheckedChange={(checked) =>
                      setChecklist({ ...checklist, [item]: checked as boolean })
                    }
                  />
                  <label htmlFor={item} className="text-sm cursor-pointer">
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status & Results */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overall_status">Overall Status *</Label>
              <Select
                value={formData.overall_status}
                onValueChange={(value) => setFormData({ ...formData, overall_status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_inspection_date">Next Inspection Date</Label>
              <Input
                id="next_inspection_date"
                type="date"
                value={formData.next_inspection_date || ''}
                onChange={(e) => setFormData({ ...formData, next_inspection_date: e.target.value })}
              />
            </div>
          </div>

          {/* Boolean Flags */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="roadworthy"
                checked={formData.roadworthy}
                onCheckedChange={(checked) => setFormData({ ...formData, roadworthy: checked as boolean })}
              />
              <label htmlFor="roadworthy" className="text-sm cursor-pointer">
                Roadworthy
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="meets_safety_standards"
                checked={formData.meets_safety_standards}
                onCheckedChange={(checked) => setFormData({ ...formData, meets_safety_standards: checked as boolean })}
              />
              <label htmlFor="meets_safety_standards" className="text-sm cursor-pointer">
                Meets Safety Standards
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reinspection_required"
                checked={formData.reinspection_required}
                onCheckedChange={(checked) => setFormData({ ...formData, reinspection_required: checked as boolean })}
              />
              <label htmlFor="reinspection_required" className="text-sm cursor-pointer">
                Reinspection Required
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Inspection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InspectionDetailDialog({ inspection }: { inspection: VlmsInspection & { vehicle: any } }) {
  const [open, setOpen] = useState(false);
  const StatusIcon = STATUS_CONFIG[inspection.overall_status].icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Inspection {inspection.inspection_id}
          </DialogTitle>
          <DialogDescription>
            {inspection.vehicle?.license_plate} - {format(new Date(inspection.inspection_date), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Overview */}
          <div className="flex items-center gap-4">
            <Badge className={`${STATUS_CONFIG[inspection.overall_status].color} text-white gap-2`}>
              <StatusIcon className="h-4 w-4" />
              {STATUS_CONFIG[inspection.overall_status].label}
            </Badge>
            {inspection.roadworthy ? (
              <Badge variant="outline" className="gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Roadworthy
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Not Roadworthy
              </Badge>
            )}
            {inspection.meets_safety_standards && (
              <Badge variant="outline" className="gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Safety Compliant
              </Badge>
            )}
          </div>

          {/* Vehicle & Inspector Info */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle ID:</span>
                  <span className="font-medium">{inspection.vehicle?.vehicle_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License Plate:</span>
                  <span className="font-medium">{inspection.vehicle?.license_plate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{inspection.vehicle?.type}</span>
                </div>
                {inspection.odometer_reading && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Odometer:</span>
                    <span className="font-medium">{inspection.odometer_reading.toLocaleString()} km</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inspector Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{inspection.inspector_name}</span>
                </div>
                {inspection.inspector_certification && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certification:</span>
                    <span className="font-medium">{inspection.inspector_certification}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">
                    {INSPECTION_TYPES.find(t => t.value === inspection.inspection_type)?.label}
                  </span>
                </div>
                {inspection.next_inspection_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Due:</span>
                    <span className="font-medium">
                      {format(new Date(inspection.next_inspection_date), 'PP')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Checklist */}
          {inspection.checklist && Object.keys(inspection.checklist).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inspection Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(inspection.checklist).map(([item, status]) => (
                    <div key={item} className="flex items-center gap-2">
                      {status ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Defects & Repairs */}
          {(inspection.defects_found?.length || inspection.priority_repairs?.length) && (
            <div className="grid grid-cols-2 gap-6">
              {inspection.defects_found && inspection.defects_found.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Defects Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {inspection.defects_found.map((defect, idx) => (
                        <li key={idx}>{defect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {inspection.priority_repairs && inspection.priority_repairs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Priority Repairs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {inspection.priority_repairs.map((repair, idx) => (
                        <li key={idx}>{repair}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Notes */}
          {inspection.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{inspection.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InspectionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: inspections, isLoading, error } = useInspections();
  const deleteMutation = useDeleteInspection();

  const filteredInspections = inspections?.filter((inspection) => {
    const search = searchTerm.toLowerCase();
    return (
      inspection.inspection_id.toLowerCase().includes(search) ||
      inspection.vehicle?.license_plate?.toLowerCase().includes(search) ||
      inspection.inspector_name.toLowerCase().includes(search)
    );
  });

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load inspections. Please refresh or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Vehicle Inspections
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Record and track vehicle safety inspections
          </p>
        </div>
        <CreateInspectionDialog />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inspection Records</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search inspections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection ID</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roadworthy</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections && filteredInspections.length > 0 ? (
                  filteredInspections.map((inspection) => {
                    const StatusIcon = STATUS_CONFIG[inspection.overall_status].icon;
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-mono text-sm">
                          {inspection.inspection_id}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{inspection.vehicle?.license_plate}</p>
                            <p className="text-xs text-muted-foreground">
                              {inspection.vehicle?.vehicle_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(inspection.inspection_date), 'PP')}</TableCell>
                        <TableCell>
                          {INSPECTION_TYPES.find(t => t.value === inspection.inspection_type)?.label}
                        </TableCell>
                        <TableCell>{inspection.inspector_name}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_CONFIG[inspection.overall_status].color} text-white gap-2`}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_CONFIG[inspection.overall_status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inspection.roadworthy ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <InspectionDetailDialog inspection={inspection} />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(inspection.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No inspections found. Create your first inspection to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
