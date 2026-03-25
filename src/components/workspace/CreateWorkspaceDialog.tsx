import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const ORG_TYPES = [
  { value: 'state_program', label: 'State Program' },
  { value: 'ngo', label: 'NGO' },
  { value: 'private', label: 'Private Ops' },
  { value: 'pharma_distributor', label: 'Pharma Distributor' },
  { value: 'government', label: 'Government' },
] as const;

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [orgType, setOrgType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; slug?: string; orgType?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; slug?: boolean; orgType?: boolean }>({});
  const queryClient = useQueryClient();
  const { switchWorkspace } = useWorkspace();

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setOrgType('');
      setIsCreating(false);
      setSlugManuallyEdited(false);
      setErrors({});
      setTouched({});
    }
  }, [open]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
    if (touched.name) {
      validateField('name', value);
    }
  };

  const handleSlugChange = (value: string) => {
    const sanitized = generateSlug(value);
    setSlug(sanitized);
    setSlugManuallyEdited(true);
    if (touched.slug) {
      validateField('slug', sanitized);
    }
  };

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Workspace name is required';
        } else if (value.trim().length < 3) {
          newErrors.name = 'Name must be at least 3 characters';
        } else {
          delete newErrors.name;
        }
        break;
      case 'slug':
        if (!value.trim()) {
          newErrors.slug = 'Slug is required';
        } else if (value.length < 3) {
          newErrors.slug = 'Slug must be at least 3 characters';
        } else if (!/^[a-z0-9-]+$/.test(value)) {
          newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
        } else {
          delete newErrors.slug;
        }
        break;
      case 'orgType':
        if (!value) {
          newErrors.orgType = 'Workspace type is required';
        } else {
          delete newErrors.orgType;
        }
        break;
    }
    setErrors(newErrors);
  };

  const handleBlur = (field: 'name' | 'slug' | 'orgType') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === 'name' ? name : field === 'slug' ? slug : orgType;
    validateField(field, value);
  };

  const validateAll = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Workspace name is required';
    else if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (!slug.trim()) newErrors.slug = 'Slug is required';
    else if (slug.length < 3) newErrors.slug = 'Slug must be at least 3 characters';
    if (!orgType) newErrors.orgType = 'Workspace type is required';
    setErrors(newErrors);
    setTouched({ name: true, slug: true, orgType: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateAll()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_workspace', {
        p_name: name.trim(),
        p_slug: slug.trim(),
        p_org_type: orgType,
      });

      if (error) {
        // Handle slug uniqueness error from DB
        if (error.message?.includes('slug already exists')) {
          setErrors((prev) => ({ ...prev, slug: 'This slug is already taken. Try a different one.' }));
          return;
        }
        throw error;
      }

      const newWorkspaceId = data as string;

      // Refresh workspace list and switch to new workspace
      await queryClient.invalidateQueries({ queryKey: ['my-workspaces'] });
      switchWorkspace(newWorkspaceId);

      toast.success('Workspace created successfully');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      toast.error(err.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = name.trim().length >= 3 && slug.trim().length >= 3 && !!orgType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="create-workspace-description">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription id="create-workspace-description">
            Set up a new workspace for your team. You will be assigned as the owner with full permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              placeholder="e.g. Kano State Program"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => handleBlur('name')}
              disabled={isCreating}
              aria-invalid={!!errors.name}
            />
            {touched.name && errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-slug">State Code</Label>
            <Input
              id="ws-slug"
              placeholder="e.g. kano-state-program"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              onBlur={() => handleBlur('slug')}
              disabled={isCreating}
              aria-invalid={!!errors.slug}
            />
            {touched.slug && errors.slug ? (
              <p className="text-xs text-destructive">{errors.slug}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Auto-generated from name.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-org-type">Workspace Type</Label>
            <Select
              value={orgType}
              onValueChange={(value) => {
                setOrgType(value);
                if (touched.orgType) validateField('orgType', value);
              }}
              disabled={isCreating}
            >
              <SelectTrigger
                id="ws-org-type"
                onBlur={() => handleBlur('orgType')}
                aria-invalid={!!errors.orgType}
              >
                <SelectValue placeholder="Select workspace type" />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {touched.orgType && errors.orgType && (
              <p className="text-xs text-destructive">{errors.orgType}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !isValid}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
