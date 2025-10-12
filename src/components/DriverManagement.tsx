import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { useDrivers } from '@/hooks/useDrivers';
import { useDriverManagement, DriverFormData } from '@/hooks/useDriverManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { useRealtimeDrivers } from '@/hooks/useRealtimeDrivers';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { DriverDetailPanel } from './DriverDetailPanel';
import { Driver } from '@/types';

const DriverManagement = () => {
  const { data: drivers = [], isLoading } = useDrivers();
  const { createDriver, updateDriver, deleteDriver, isCreating, isUpdating } = useDriverManagement();
  const { hasPermission } = usePermissions();
  useRealtimeDrivers(); // Enable real-time updates
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    phone: '',
    license_type: 'standard',
    shift_start: '08:00',
    shift_end: '17:00',
    max_hours: 8
  });

  const canManage = hasPermission('manage_drivers');

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      license_type: 'standard',
      shift_start: '08:00',
      shift_end: '17:00',
      max_hours: 8
    });
    setEditingDriver(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      toast.error('You do not have permission to manage drivers');
      return;
    }

    if (editingDriver) {
      updateDriver({ id: editingDriver.id, data: formData });
    } else {
      createDriver(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      license_type: driver.licenseType,
      license_expiry: driver.licenseExpiry,
      shift_start: driver.shiftStart,
      shift_end: driver.shiftEnd,
      max_hours: driver.maxHours
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canManage) {
      toast.error('You do not have permission to manage drivers');
      return;
    }
    
    if (confirm('Are you sure you want to delete this driver?')) {
      deleteDriver(id);
    }
  };

  const handleRowClick = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDetailPanelOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading drivers...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Driver Management</h1>
          <p className="text-muted-foreground">Manage your delivery drivers</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                <DialogDescription>
                  {editingDriver ? 'Update driver information' : 'Enter driver details'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_type">License Type</Label>
                    <Select
                      value={formData.license_type}
                      onValueChange={(value: 'standard' | 'commercial') => 
                        setFormData({ ...formData, license_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift_start">Shift Start</Label>
                      <Input
                        id="shift_start"
                        type="time"
                        value={formData.shift_start}
                        onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shift_end">Shift End</Label>
                      <Input
                        id="shift_end"
                        type="time"
                        value={formData.shift_end}
                        onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_hours">Max Hours per Day</Label>
                    <Input
                      id="max_hours"
                      type="number"
                      min="1"
                      max="12"
                      value={formData.max_hours}
                      onChange={(e) => setFormData({ ...formData, max_hours: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {editingDriver ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>Total: {drivers.length} drivers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Performance</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow 
                  key={driver.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(driver)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {driver.name}
                    </div>
                  </TableCell>
                  <TableCell>{driver.phone}</TableCell>
                  <TableCell className="capitalize">{driver.licenseType}</TableCell>
                  <TableCell>
                    <Badge variant={
                      driver.status === 'available' ? 'default' :
                      driver.status === 'busy' ? 'secondary' : 'outline'
                    }>
                      {driver.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{driver.shiftStart} - {driver.shiftEnd}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{driver.onTimePercentage?.toFixed(0)}% on-time</div>
                      <div className="text-muted-foreground">{driver.totalDeliveries || 0} deliveries</div>
                    </div>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(driver);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(driver.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DriverDetailPanel
        driver={selectedDriver}
        open={isDetailPanelOpen}
        onOpenChange={setIsDetailPanelOpen}
      />
    </div>
  );
};

export default DriverManagement;
