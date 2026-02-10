import React, { useState, ReactNode, ErrorInfo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  Truck, 
  Users, 
  TreePine, 
  Search, 
  Filter, 
  Download,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useFleets, 
  useCreateFleet, 
  useUpdateFleet, 
  useDeleteFleet 
} from '@/hooks/useFleets';
import { 
  useVendors, 
  useCreateVendor, 
  useUpdateVendor, 
  useDeleteVendor 
} from '@/hooks/useVendors';
import { useVehicles } from '@/hooks/useVehicles';
import { FleetHierarchyVisualization } from '@/components/fleet/FleetHierarchyVisualization';
import FleetManagementSkeleton from '@/components/fleet/FleetManagementSkeleton';
import { VendorRegistrationForm } from '@/components/vendors/VendorRegistrationForm';
import type { VendorRegistrationInput } from '@/lib/validations/vendor';

// Add error boundary to catch and display errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in FleetManagement:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-destructive">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p>Please try refreshing the page or contact support if the problem persists.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function FleetManagementPage() {
  
  // Data fetching with loading and error states
  const { 
    data: fleets = [], 
    isLoading: fleetsLoading, 
    isError: fleetsError,
    error: fleetsErrorData
  } = useFleets();
  
  const { 
    data: vendors = [], 
    isLoading: vendorsLoading, 
    isError: vendorsError,
    error: vendorsErrorData
  } = useVendors();
  
  const { 
    data: vehicles = [], 
    isLoading: vehiclesLoading, 
    isError: vehiclesError,
    error: vehiclesErrorData
  } = useVehicles();

  // Log any errors
  React.useEffect(() => {
    if (fleetsError) {
      console.error('Error fetching fleets:', fleetsErrorData);
    }
    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsErrorData);
    }
    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesErrorData);
    }
  }, [fleetsError, vendorsError, vehiclesError, fleetsErrorData, vendorsErrorData, vehiclesErrorData]);

  // Mutations
  const createFleetMutation = useCreateFleet();
  const updateFleetMutation = useUpdateFleet();
  const deleteFleetMutation = useDeleteFleet();
  const createVendorMutation = useCreateVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();

  // Local state
  const [activeTab, setActiveTab] = useState('fleets');
  const [isFleetDialogOpen, setIsFleetDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<any>(null);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteFleetId, setDeleteFleetId] = useState<string | null>(null);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fleets: true,
    vendors: false,
    vehicles: false
  });

  // Form state - MUST be before any conditional returns
  const [fleetFormData, setFleetFormData] = useState({
    name: '',
    vendorId: '',
    mission: '',
    status: 'active'
  });

  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    contactName: '',
    contactPhone: '',
    email: '',
    address: ''
  });

  // Derived state
  const isLoading = fleetsLoading || vendorsLoading || vehiclesLoading;
  const hasError = fleetsError || vendorsError || vehiclesError;

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <FleetManagementSkeleton />
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>There was an error loading the fleet management data. Please try again later.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-destructive/20 text-destructive hover:bg-destructive/10"
            >
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const resetFleetForm = () => {
    setFleetFormData({
      name: '',
      vendorId: '',
      mission: '',
      status: 'active'
    });
    setEditingFleet(null);
  };

  const resetVendorForm = () => {
    setVendorFormData({
      name: '',
      contactName: '',
      contactPhone: '',
      email: '',
      address: ''
    });
    setEditingVendor(null);
  };

  const handleFleetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFleet) {
        await updateFleetMutation.mutateAsync({
          id: editingFleet.id,
          data: {
            name: fleetFormData.name,
            vendor_id: fleetFormData.vendorId || undefined,
            mission: fleetFormData.mission,
            status: fleetFormData.status as 'active' | 'inactive'
          }
        });
      } else {
        await createFleetMutation.mutateAsync({
          name: fleetFormData.name,
          vendor_id: fleetFormData.vendorId || undefined,
          mission: fleetFormData.mission,
          status: fleetFormData.status as 'active' | 'inactive'
        });
      }
      setIsFleetDialogOpen(false);
      resetFleetForm();
    } catch (error) {
      console.error('Error submitting fleet:', error);
    }
  };

  const handleVendorSubmit = async (data: VendorRegistrationInput) => {
    try {
      if (editingVendor) {
        await updateVendorMutation.mutateAsync({
          id: editingVendor.id,
          data: data as any
        });
      } else {
        await createVendorMutation.mutateAsync(data as any);
      }
      setIsVendorDialogOpen(false);
      resetVendorForm();
    } catch (error) {
      console.error('Error submitting vendor:', error);
    }
  };

  const handleEditFleet = (fleet: any) => {
    setEditingFleet(fleet);
    setFleetFormData({
      name: fleet.name,
      vendorId: fleet.vendor_id || '',
      mission: fleet.mission || '',
      status: fleet.status
    });
    setIsFleetDialogOpen(true);
  };

  const handleEditVendor = (vendor: any) => {
    setEditingVendor(vendor);
    setVendorFormData({
      name: vendor.name,
      contactName: vendor.contact_name || '',
      contactPhone: vendor.contact_phone || '',
      email: vendor.email || '',
      address: vendor.address || ''
    });
    setIsVendorDialogOpen(true);
  };

  const handleConfirmDeleteFleet = async () => {
    if (!deleteFleetId) return;

    try {
      await deleteFleetMutation.mutateAsync(deleteFleetId);
      setDeleteFleetId(null);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleConfirmDeleteVendor = async () => {
    if (!deleteVendorId) return;

    try {
      await deleteVendorMutation.mutateAsync(deleteVendorId);
      setDeleteVendorId(null);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'inactive': return 'bg-muted text-muted-foreground border-border';
      case 'available': return 'bg-primary/10 text-primary border-primary/20';
      case 'in-use': return 'bg-warning/10 text-warning border-warning/20';
      case 'maintenance': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fleet Management</h1>
            <p className="text-muted-foreground">Manage fleets, vehicles, and vendor relationships</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fleets" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fleets
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Fleet Hierarchy
            </TabsTrigger>
          </TabsList>

          {/* Fleets Tab */}
          <TabsContent value="fleets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Fleet Management</h2>
              <Dialog open={isFleetDialogOpen} onOpenChange={setIsFleetDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetFleetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fleet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingFleet ? 'Edit Fleet' : 'Create New Fleet'}</DialogTitle>
                    <DialogDescription>
                      {editingFleet ? 'Update fleet information' : 'Enter fleet details'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFleetSubmit}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="fleet-name">Fleet Name</Label>
                        <Input
                          id="fleet-name"
                          value={fleetFormData.name}
                          onChange={(e) => setFleetFormData({ ...fleetFormData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendor">Vendor</Label>
                        <Select
                          value={fleetFormData.vendorId}
                          onValueChange={(value) => setFleetFormData({ ...fleetFormData, vendorId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mission">Mission</Label>
                        <Input
                          id="mission"
                          value={fleetFormData.mission}
                          onChange={(e) => setFleetFormData({ ...fleetFormData, mission: e.target.value })}
                          placeholder="Fleet operational mission"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={fleetFormData.status}
                          onValueChange={(value) => setFleetFormData({ ...fleetFormData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsFleetDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingFleet ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Fleets</CardTitle>
                <CardDescription>Manage your fleet operations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fleet Name</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vehicles</TableHead>
                      <TableHead>Mission</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading fleets...
                        </TableCell>
                      </TableRow>
                    ) : fleets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No fleets found. Create your first fleet to get started.
                        </TableCell>
                      </TableRow>
                    ) : fleets.map((fleet) => (
                      <TableRow key={fleet.id}>
                        <TableCell className="font-medium">{fleet.name}</TableCell>
                        <TableCell>{fleet.vendor?.name || 'No vendor'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(fleet.status)}>
                            {fleet.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{fleet.vehicle_count || 0}</TableCell>
                        <TableCell className="max-w-xs truncate">{fleet.mission || 'No mission'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFleet(fleet)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteFleetId(fleet.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fleet Vehicles</CardTitle>
                <CardDescription>Vehicles grouped by fleet assignment</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Plate Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fleet</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Capacity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.model}</TableCell>
                        <TableCell>{vehicle.plateNumber}</TableCell>
                        <TableCell className="capitalize">{vehicle.type}</TableCell>
                        <TableCell>{(vehicle as any).fleet?.name || 'No fleet'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vehicle.status)}>
                            {vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{(vehicle as any).capacity_volume_m3 || 0} m³</div>
                            <div className="text-muted-foreground">{(vehicle as any).capacity_weight_kg || 0} kg</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vendor Management</h2>
              <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetVendorForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Create New Vendor'}</DialogTitle>
                    <DialogDescription>
                      {editingVendor
                        ? 'Update vendor information and role classification'
                        : 'Register a new organization with role-based capabilities'}
                    </DialogDescription>
                  </DialogHeader>
                  <VendorRegistrationForm
                    vendor={editingVendor}
                    onSubmit={handleVendorSubmit}
                    onCancel={() => setIsVendorDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Registered Vendors</CardTitle>
                <CardDescription>Manage vendor partnerships</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Primary Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fleets</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>
                          {vendor.organization_type ? (
                            <Badge variant="outline">
                              {vendor.organization_type.replace(/_/g, ' ')}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vendor.vendor_roles && vendor.vendor_roles.length > 0 ? (
                              vendor.vendor_roles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role === 'service_vendor' ? 'Service Vendor' : role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {vendor.organization_lead_name || vendor.contact_name || 'N/A'}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {vendor.primary_email || vendor.email || vendor.primary_phone || vendor.contact_phone || ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {vendor.vendor_status ? (
                            <Badge
                              variant={
                                vendor.vendor_status === 'active'
                                  ? 'default'
                                  : vendor.vendor_status === 'suspended'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {vendor.vendor_status}
                            </Badge>
                          ) : (
                            <Badge variant="default">active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{vendor.fleet_count || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVendor(vendor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteVendorId(vendor.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet Hierarchy Tab */}
          <TabsContent value="hierarchy" className="space-y-4">
            <FleetHierarchyVisualization
              onCreateSubFleet={(parentFleetId) => {
                setFleetFormData({
                  ...fleetFormData,
                  name: '',
                  vendorId: '',
                  mission: '',
                  status: 'active'
                });
                // Set parent fleet ID for sub-fleet creation
                // This would need to be added to the form data structure
                setIsFleetDialogOpen(true);
              }}
              onEditFleet={handleEditFleet}
            />
          </TabsContent>
        </Tabs>

      {/* Delete Fleet Confirmation Dialog */}
      <AlertDialog open={!!deleteFleetId} onOpenChange={(open) => !open && setDeleteFleetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fleet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fleet? This action cannot be undone. All vehicles in this fleet will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteFleet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Fleet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Vendor Confirmation Dialog */}
      <AlertDialog open={!!deleteVendorId} onOpenChange={(open) => !open && setDeleteVendorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vendor? This action cannot be undone. All fleets associated with this vendor will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteVendor}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
