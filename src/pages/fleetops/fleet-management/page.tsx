import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Building2, Truck, Users, TreePine } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { useFleets, useCreateFleet, useUpdateFleet, useDeleteFleet } from '@/hooks/useFleets';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/useVendors';
import { useVehicles } from '@/hooks/useVehicles';
import { FleetHierarchyVisualization } from '@/components/fleet/FleetHierarchyVisualization';

export default function FleetManagementPage() {
  // Real data hooks
  const { data: fleets = [], isLoading: fleetsLoading } = useFleets();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();

  const createFleetMutation = useCreateFleet();
  const updateFleetMutation = useUpdateFleet();
  const deleteFleetMutation = useDeleteFleet();

  const createVendorMutation = useCreateVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();
  const [activeTab, setActiveTab] = useState('fleets');
  const [isFleetDialogOpen, setIsFleetDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<any>(null);
  const [editingVendor, setEditingVendor] = useState<any>(null);

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

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await updateVendorMutation.mutateAsync({
          id: editingVendor.id,
          data: {
            name: vendorFormData.name,
            contact_name: vendorFormData.contactName,
            contact_phone: vendorFormData.contactPhone,
            email: vendorFormData.email,
            address: vendorFormData.address
          }
        });
      } else {
        await createVendorMutation.mutateAsync({
          name: vendorFormData.name,
          contact_name: vendorFormData.contactName,
          contact_phone: vendorFormData.contactPhone,
          email: vendorFormData.email,
          address: vendorFormData.address
        });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-transparent';
      case 'inactive': return 'bg-secondary text-secondary-foreground border-transparent';
      case 'available': return 'bg-blue-500/10 text-blue-700 border-transparent';
      case 'in-use': return 'bg-amber-500/10 text-amber-700 border-transparent';
      case 'maintenance': return 'bg-red-500/10 text-red-700 border-transparent';
      default: return 'bg-secondary text-secondary-foreground border-transparent';
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header Section - Modern CRM Style */}
        <div className="border-b border-border/50 pb-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Fleet Management</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Manage fleets, vehicles, and vendor relationships</p>
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-[13px]">
              <Plus className="h-3.5 w-3.5" />
              Add Fleet
            </Button>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
                <Building2 className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Total Fleets</p>
                <p className="text-xl font-semibold">{fleets.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
                <Truck className="h-4 w-4 text-green-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Total Vehicles</p>
                <p className="text-xl font-semibold">{vehicles.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Total Vendors</p>
                <p className="text-xl font-semibold">{vendors.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10">
                <TreePine className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Fleet Hierarchy</p>
                <p className="text-xl font-semibold">{fleets.filter(f => f.parent_fleet_id).length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs - Modern Style */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full md:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 px-4">Overview</TabsTrigger>
            <TabsTrigger value="fleets" className="flex items-center gap-2 px-4">
              <Building2 className="h-4 w-4" />
              Fleets
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-2 px-4">
              <Truck className="h-4 w-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2 px-4">
              <Users className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="flex items-center gap-2 px-4">
              <TreePine className="h-4 w-4" />
              Hierarchy
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - CRM Dashboard Style */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Recent Activity */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-[15px] font-semibold">Recent Activity</CardTitle>
                  <CardDescription className="text-[13px]">Latest fleet operations</CardDescription>
                </CardHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
                      <Building2 className="h-3 w-3 text-green-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium">New fleet created</p>
                      <p className="text-[12px] text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10">
                      <Truck className="h-3 w-3 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium">Vehicle assigned to fleet</p>
                      <p className="text-[12px] text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10">
                      <Users className="h-3 w-3 text-purple-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium">Vendor partnership added</p>
                      <p className="text-[12px] text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-[15px] font-semibold">Quick Actions</CardTitle>
                  <CardDescription className="text-[13px]">Common management tasks</CardDescription>
                </CardHeader>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2" onClick={() => setIsFleetDialogOpen(true)}>
                    <Building2 className="h-4 w-4" />
                    <span className="text-[12px]">Add Fleet</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2" onClick={() => setIsVendorDialogOpen(true)}>
                    <Users className="h-4 w-4" />
                    <span className="text-[12px]">Add Vendor</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2" onClick={() => setActiveTab('vehicles')}>
                    <Truck className="h-4 w-4" />
                    <span className="text-[12px]">View Vehicles</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-auto p-4 flex-col gap-2" onClick={() => setActiveTab('hierarchy')}>
                    <TreePine className="h-4 w-4" />
                    <span className="text-[12px]">View Hierarchy</span>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Fleet Performance Overview */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-[15px] font-semibold">Fleet Performance</CardTitle>
                <CardDescription className="text-[13px]">Operational efficiency metrics</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-3 rounded-md bg-green-500/5 border border-green-500/10">
                  <div>
                    <p className="text-[13px] font-medium text-green-700">Active Fleets</p>
                    <p className="text-lg font-semibold text-green-700">{fleets.filter(f => f.status === 'active').length}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
                    <Building2 className="h-4 w-4 text-green-700" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-blue-500/5 border border-blue-500/10">
                  <div>
                    <p className="text-[13px] font-medium text-blue-700">Available Vehicles</p>
                    <p className="text-lg font-semibold text-blue-700">{vehicles.filter(v => v.status === 'available').length}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
                    <Truck className="h-4 w-4 text-blue-700" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-amber-500/5 border border-amber-500/10">
                  <div>
                    <p className="text-[13px] font-medium text-amber-700">Maintenance Due</p>
                    <p className="text-lg font-semibold text-amber-700">{vehicles.filter(v => v.status === 'maintenance').length}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10">
                    <TreePine className="h-4 w-4 text-amber-700" />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Fleets Tab - Card Grid Layout */}
          <TabsContent value="fleets" className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <div>
                <h2 className="text-[15px] font-semibold">Fleet Management</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">Manage your fleet operations</p>
              </div>
              <Dialog open={isFleetDialogOpen} onOpenChange={setIsFleetDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5 text-[13px]" onClick={resetFleetForm}>
                    <Plus className="h-3.5 w-3.5" />
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

            {/* Fleet Cards Grid */}
            {fleetsLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-5 animate-pulse">
                    <div className="space-y-3">
                      <div className="h-4 bg-secondary rounded-md"></div>
                      <div className="h-3 bg-secondary rounded-md w-2/3"></div>
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-secondary rounded-md w-1/3"></div>
                        <div className="h-5 w-12 bg-secondary rounded-md"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : fleets.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/50">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">No fleets yet</h3>
                    <p className="text-[13px] text-muted-foreground mt-1">Create your first fleet to get started</p>
                  </div>
                  <Button size="sm" className="mt-2" onClick={() => setIsFleetDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Fleet
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fleets.map((fleet) => (
                  <Card key={fleet.id} className="p-5 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => handleEditFleet(fleet)}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10 flex-shrink-0">
                            <Building2 className="h-5 w-5 text-blue-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-semibold truncate">{fleet.name}</h3>
                            <p className="text-[13px] text-muted-foreground truncate">{fleet.vendor?.name || 'No vendor'}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(fleet.status)}>
                          {fleet.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-foreground">{fleet.vehicle_count || 0}</p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Vehicles</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-foreground">0</p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Sub-fleets</p>
                        </div>
                      </div>
                      
                      {fleet.mission && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-[12px] text-muted-foreground line-clamp-2">{fleet.mission}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
              <h2 className="text-[15px] font-semibold">Vendor Management</h2>
              <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetVendorForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Create New Vendor'}</DialogTitle>
                    <DialogDescription>
                      {editingVendor ? 'Update vendor information' : 'Enter vendor details'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleVendorSubmit}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor-name">Vendor Name</Label>
                        <Input
                          id="vendor-name"
                          value={vendorFormData.name}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">Contact Name</Label>
                        <Input
                          id="contact-name"
                          value={vendorFormData.contactName}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, contactName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">Contact Phone</Label>
                        <Input
                          id="contact-phone"
                          value={vendorFormData.contactPhone}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, contactPhone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={vendorFormData.email}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={vendorFormData.address}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingVendor ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
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
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Fleets</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.contact_name || 'N/A'}</TableCell>
                        <TableCell>{vendor.contact_phone || 'N/A'}</TableCell>
                        <TableCell>{vendor.email || 'N/A'}</TableCell>
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
                              onClick={() => toast.info('Delete functionality coming soon')}
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>
    </Layout>
  );
}
