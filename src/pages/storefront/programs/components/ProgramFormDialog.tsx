import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateProgram, useUpdateProgram } from '@/hooks/usePrograms';
import { toast } from 'sonner';
import type { Program, ProgramFormData } from '@/types/program';

interface ProgramFormDialogProps {
  program?: Program;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgramFormDialog({
  program,
  open,
  onOpenChange,
}: ProgramFormDialogProps) {
  const isEditing = !!program;
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormData>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      funding_source: '',
      priority_tier: 'NORMAL',
      requires_cold_chain: false,
      sla_days: undefined,
      status: 'active',
    },
  });

  // Load program data when editing
  useEffect(() => {
    if (program) {
      reset({
        name: program.name,
        code: program.code,
        description: program.description || '',
        funding_source: program.funding_source || '',
        priority_tier: program.priority_tier,
        requires_cold_chain: program.requires_cold_chain,
        sla_days: program.sla_days || undefined,
        status: program.status,
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        funding_source: '',
        priority_tier: 'NORMAL',
        requires_cold_chain: false,
        sla_days: undefined,
        status: 'active',
      });
    }
  }, [program, reset]);

  const onSubmit = async (data: ProgramFormData) => {
    try {
      if (isEditing) {
        await updateProgram.mutateAsync({
          id: program.id,
          ...data,
        });
        toast.success('Program updated successfully');
      } else {
        await createProgram.mutateAsync(data);
        toast.success('Program created successfully');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save program');
    }
  };

  const priorityTier = watch('priority_tier');
  const requiresColdChain = watch('requires_cold_chain');
  const status = watch('status');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Program' : 'Create New Program'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update program configuration and operational parameters'
              : 'Configure a new operational program with funding and policy settings'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Program Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Program name is required' })}
                  placeholder="e.g., ART Program"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Program Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  {...register('code', { required: 'Program code is required' })}
                  placeholder="e.g., ART-01"
                  className="font-mono"
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the program..."
                rows={3}
              />
            </div>
          </div>

          {/* Funding & Priority */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Funding & Priority</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funding_source">Funding Source</Label>
                <Select
                  value={watch('funding_source')}
                  onValueChange={(value) => setValue('funding_source', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select funding source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usaid-pmm">USAID PMM</SelectItem>
                    <SelectItem value="usaid-art">USAID ART</SelectItem>
                    <SelectItem value="global-fund">Global Fund</SelectItem>
                    <SelectItem value="usaid-nhdp">USAID NHDP</SelectItem>
                    <SelectItem value="who">WHO</SelectItem>
                    <SelectItem value="unfpa">UNFPA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority_tier">
                  Priority Tier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={priorityTier}
                  onValueChange={(value) =>
                    setValue('priority_tier', value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Operational Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Operational Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sla_days">SLA (Days)</Label>
                <Input
                  id="sla_days"
                  type="number"
                  {...register('sla_days', { valueAsNumber: true })}
                  placeholder="e.g., 7"
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Expected fulfillment window
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={status}
                  onValueChange={(value) => setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="requires_cold_chain"
                checked={requiresColdChain}
                onCheckedChange={(checked) =>
                  setValue('requires_cold_chain', checked)
                }
              />
              <Label htmlFor="requires_cold_chain" className="cursor-pointer">
                Requires Cold Chain
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Enable if this program requires temperature-controlled storage and
              transport
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isEditing
                ? 'Update Program'
                : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
