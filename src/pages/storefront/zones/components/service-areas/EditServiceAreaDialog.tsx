import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateServiceArea } from '@/hooks/useServiceAreas';
import type { ServiceArea, ServiceType, DeliveryFrequency, ServicePriority } from '@/types/service-areas';

interface EditServiceAreaDialogProps {
  serviceArea: ServiceArea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServiceAreaDialog({ serviceArea, open, onOpenChange }: EditServiceAreaDialogProps) {
  const [form, setForm] = useState({
    name: serviceArea.name,
    service_type: serviceArea.service_type,
    priority: serviceArea.priority,
    delivery_frequency: serviceArea.delivery_frequency || '',
    max_distance_km: serviceArea.max_distance_km?.toString() || '',
    sla_hours: serviceArea.sla_hours?.toString() || '',
    description: serviceArea.description || '',
    is_active: serviceArea.is_active,
  });

  const updateMutation = useUpdateServiceArea();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({
      id: serviceArea.id,
      name: form.name,
      service_type: form.service_type as ServiceType,
      priority: form.priority as ServicePriority,
      delivery_frequency: form.delivery_frequency as DeliveryFrequency || undefined,
      max_distance_km: form.max_distance_km ? Number(form.max_distance_km) : undefined,
      sla_hours: form.sla_hours ? Number(form.sla_hours) : undefined,
      description: form.description || undefined,
      is_active: form.is_active,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Service Area</DialogTitle>
          <DialogDescription>Update service area configuration</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-sa-name">Name</Label>
            <Input
              id="edit-sa-name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Service Type</Label>
              <Select
                value={form.service_type}
                onValueChange={(v) => setForm(prev => ({ ...prev, service_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="arv">ARV</SelectItem>
                  <SelectItem value="epi">EPI</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm(prev => ({ ...prev, priority: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Frequency</Label>
              <Select
                value={form.delivery_frequency}
                onValueChange={(v) => setForm(prev => ({ ...prev, delivery_frequency: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-max-dist">Max Distance (km)</Label>
              <Input
                id="edit-max-dist"
                type="number"
                value={form.max_distance_km}
                onChange={(e) => setForm(prev => ({ ...prev, max_distance_km: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-sla">SLA (hours)</Label>
              <Input
                id="edit-sla"
                type="number"
                value={form.sla_hours}
                onChange={(e) => setForm(prev => ({ ...prev, sla_hours: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-sa-desc">Description</Label>
            <Textarea
              id="edit-sa-desc"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit-sa-active">Active</Label>
            <Switch
              id="edit-sa-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !form.name}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
