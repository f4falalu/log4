import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateGroup } from '@/hooks/rbac';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (groupId: string) => void;
}

export function CreateGroupDialog({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const createGroup = useCreateGroup();

  const generateCode = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 50);
  };

  const handleSubmit = async () => {
    if (!name || !code) return;

    try {
      const group = await createGroup.mutateAsync({
        name,
        code,
        description: description || undefined,
      });

      toast({ title: 'Group created' });
      onSuccess(group.id);
      setName('');
      setCode('');
      setDescription('');
    } catch (error) {
      toast({
        title: 'Error creating group',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Create a new user group with shared permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code || code === generateCode(name)) {
                  setCode(generateCode(e.target.value));
                }
              }}
              placeholder="e.g., Warehouse Officers"
            />
          </div>

          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g., warehouse_officers"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this group..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !code || createGroup.isPending}
          >
            {createGroup.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
