import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { Badge } from './ui/badge';

interface VehicleTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VehicleTypeManager = ({ open, onOpenChange }: VehicleTypeManagerProps) => {
  const { vehicleTypes, addType, updateType, deleteType, isAdding, isDeleting } = useVehicleTypes();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', display_name: '', icon_name: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateType({ id: editingId, data: formData });
      setEditingId(null);
    } else {
      addType(formData);
    }
    setFormData({ name: '', display_name: '', icon_name: '' });
    setIsAddingNew(false);
  };

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      display_name: type.display_name,
      icon_name: type.icon_name || ''
    });
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({ name: '', display_name: '', icon_name: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Manage Vehicle Types</span>
            {!isAddingNew && (
              <Button onClick={() => setIsAddingNew(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isAddingNew ? (
          <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div>
              <Label htmlFor="name">Name (lowercase, no spaces)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="motorcycle"
                required
                disabled={!!editingId}
              />
            </div>
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Motorcycle"
                required
              />
            </div>
            <div>
              <Label htmlFor="icon_name">Icon (emoji)</Label>
              <Input
                id="icon_name"
                value={formData.icon_name}
                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                placeholder="🏍️"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isAdding}>
                {editingId ? 'Update' : 'Add'} Type
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {vehicleTypes?.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {type.icon_name && <span className="text-2xl">{type.icon_name}</span>}
                  <div>
                    <div className="font-medium">{type.display_name}</div>
                    <div className="text-sm text-muted-foreground">{type.name}</div>
                  </div>
                  {type.is_default && (
                    <Badge variant="secondary" className="ml-2">Default</Badge>
                  )}
                </div>
                {!type.is_default && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(type)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteType(type.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
