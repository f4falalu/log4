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

// Mock data - will be replaced with actual hooks
const mockFleets = [
  {
    id: '1',
    name: 'Main Fleet',
    vendor: 'BIKO Logistics',
    status: 'active',
    mission: 'Primary delivery operations for Lagos and surrounding areas',
    vehicleCount: 12,
    parentFleet: null
  },
  {
    id: '2', 
    name: 'Northern Operations',
    vendor: 'Regional Delivery Services',
    status: 'active',
    mission: 'Specialized fleet for northern Nigeria operations',
    vehicleCount: 8,
    parentFleet: null
  }
];

const mockVendors = [
  {
    id: '1',
    name: 'BIKO Logistics',
    contactName: 'John Manager',
    contactPhone: '+234-800-BIKO-001',
    email: 'fleet@biko.ng',
    address: 'Lagos, Nigeria',
    fleetCount: 1
  },
  {
    id: '2',
    name: 'Partner Transport Co',
    contactName: 'Sarah Wilson', 
    contactPhone: '+234-800-PART-002',
    email: 'ops@partnertransport.ng',
    address: 'Abuja, Nigeria',
    fleetCount: 0
  }
];

const mockVehicles = [
  {
    id: '1',
    model: 'Toyota Hiace',
    plateNumber: 'ABC-123-XY',
    type: 'van',
    fleet: 'Main Fleet',
    status: 'available',
    capacityVolume: 8.0,
    capacityWeight: 2000
  },
  {
    id: '2',
    model: 'Isuzu NPR',
    plateNumber: 'DEF-456-ZW',
    type: 'truck', 
    fleet: 'Main Fleet',
    status: 'in-use',
    capacityVolume: 15.0,
    capacityWeight: 5000
  }
];

export default function FleetManagementPage() {
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

  const handleFleetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement fleet creation/update logic
    toast.success(editingFleet ? 'Fleet updated successfully' : 'Fleet created successfully');
    setIsFleetDialogOpen(false);
    resetFleetForm();
  };

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement vendor creation/update logic
    toast.success(editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully');
    setIsVendorDialogOpen(false);
    resetVendorForm();
  };

  const handleEditFleet = (fleet: any) => {
    setEditingFleet(fleet);
    setFleetFormData({
      name: fleet.name,
      vendorId: fleet.vendorId || '',
      mission: fleet.mission,
      status: fleet.status
    });
    setIsFleetDialogOpen(true);
  };

  const handleEditVendor = (vendor: any) => {
    setEditingVendor(vendor);
    setVendorFormData({
      name: vendor.name,
      contactName: vendor.contactName,
      contactPhone: vendor.contactPhone,
      email: vendor.email,
      address: vendor.address
    });
    setIsVendorDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'available': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-use': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'maintenance': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
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
                            {mockVendors.map((vendor) => (
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
                    {mockFleets.map((fleet) => (
                      <TableRow key={fleet.id}>
                        <TableCell className="font-medium">{fleet.name}</TableCell>
                        <TableCell>{fleet.vendor}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(fleet.status)}>
                            {fleet.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{fleet.vehicleCount}</TableCell>
                        <TableCell className="max-w-xs truncate">{fleet.mission}</TableCell>
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
                    {mockVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.model}</TableCell>
                        <TableCell>{vehicle.plateNumber}</TableCell>
                        <TableCell className="capitalize">{vehicle.type}</TableCell>
                        <TableCell>{vehicle.fleet}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vehicle.status)}>
                            {vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{vehicle.capacityVolume} m³</div>
                            <div className="text-muted-foreground">{vehicle.capacityWeight} kg</div>
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
                    {mockVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.contactName}</TableCell>
                        <TableCell>{vendor.contactPhone}</TableCell>
                        <TableCell>{vendor.email}</TableCell>
                        <TableCell>{vendor.fleetCount}</TableCell>
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
            <Card>
              <CardHeader>
                <CardTitle>Fleet Hierarchy</CardTitle>
                <CardDescription>Organizational structure of fleets and sub-fleets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TreePine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Fleet hierarchy visualization coming soon</p>
                  <p className="text-sm">This will show parent-child fleet relationships</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
