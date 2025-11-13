import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateZone } from '@/hooks/useOperationalZones';
import { CreateZoneInput } from '@/types/zones';

interface CreateZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateZoneDialog({ open, onOpenChange }: CreateZoneDialogProps) {
  const [formData, setFormData] = useState<CreateZoneInput>({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });

  const createZone = useCreateZone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createZone.mutateAsync(formData);
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        code: '',
        description: '',
        is_active: true,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleChange = (field: keyof CreateZoneInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Zone</DialogTitle>
            <DialogDescription>
              Add a new operational zone to organize warehouses, LGAs, and facilities.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Zone Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Central Zone"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">Zone Code</Label>
              <Input
                id="code"
                placeholder="e.g., CZ01"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional short code for easy reference
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the zone's coverage area..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Enable this zone for operations
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createZone.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createZone.isPending}>
              {createZone.isPending ? 'Creating...' : 'Create Zone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
