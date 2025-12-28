import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLGA, useUpdateLGA } from '@/hooks/useLGAs';
import { LGA, CreateLGAInput } from '@/types/zones';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useWarehouses } from '@/hooks/useWarehouses';

const lgaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  zone_id: z.string().optional().nullable(),
  warehouse_id: z.string().optional().nullable(),
  state: z.string().min(1, 'State is required'),
  population: z.number().int().positive().optional().nullable(),
});

type LGAFormData = z.infer<typeof lgaSchema>;

interface LGAFormDialogProps {
  lga?: LGA;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LGAFormDialog({ lga, open, onOpenChange }: LGAFormDialogProps) {
  const createLGA = useCreateLGA();
  const updateLGA = useUpdateLGA();
  const { data: zones } = useOperationalZones();
  const { data: warehouses } = useWarehouses();

  const [populationInput, setPopulationInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LGAFormData>({
    resolver: zodResolver(lgaSchema),
    defaultValues: {
      name: '',
      zone_id: null,
      warehouse_id: null,
      state: 'kano',
      population: null,
    },
  });

  const selectedZoneId = watch('zone_id');
  const selectedWarehouseId = watch('warehouse_id');

  useEffect(() => {
    if (lga) {
      reset({
        name: lga.name,
        zone_id: lga.zone_id || null,
        warehouse_id: lga.warehouse_id || null,
        state: lga.state,
        population: lga.population || null,
      });
      setPopulationInput(lga.population?.toString() || '');
    } else {
      reset({
        name: '',
        zone_id: null,
        warehouse_id: null,
        state: 'kano',
        population: null,
      });
      setPopulationInput('');
    }
  }, [lga, reset, open]);

  const onSubmit = async (data: LGAFormData) => {
    try {
      if (lga) {
        await updateLGA.mutateAsync({
          id: lga.id,
          ...data,
        });
      } else {
        await createLGA.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handlePopulationChange = (value: string) => {
    setPopulationInput(value);
    const num = parseInt(value, 10);
    setValue('population', isNaN(num) ? null : num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lga ? 'Edit LGA' : 'Add New LGA'}</DialogTitle>
          <DialogDescription>
            {lga
              ? 'Update the LGA information below'
              : 'Add a new Local Government Area to the system'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter LGA name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state">
              State <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch('state')}
              onValueChange={(value) => setValue('state', value)}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kano">Kano</SelectItem>
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-sm text-destructive">{errors.state.message}</p>
            )}
          </div>

          {/* Zone */}
          <div className="space-y-2">
            <Label htmlFor="zone">Zone (Optional)</Label>
            <Select
              value={selectedZoneId || 'none'}
              onValueChange={(value) => setValue('zone_id', value === 'none' ? null : value)}
            >
              <SelectTrigger id="zone">
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No zone</SelectItem>
                {zones?.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warehouse */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse (Optional)</Label>
            <Select
              value={selectedWarehouseId || 'none'}
              onValueChange={(value) =>
                setValue('warehouse_id', value === 'none' ? null : value)
              }
            >
              <SelectTrigger id="warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No warehouse</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Population */}
          <div className="space-y-2">
            <Label htmlFor="population">Population (Optional)</Label>
            <Input
              id="population"
              type="number"
              value={populationInput}
              onChange={(e) => handlePopulationChange(e.target.value)}
              placeholder="Enter population"
              min="0"
              step="1"
            />
            {errors.population && (
              <p className="text-sm text-destructive">{errors.population.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createLGA.isPending || updateLGA.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLGA.isPending || updateLGA.isPending}>
              {createLGA.isPending || updateLGA.isPending
                ? 'Saving...'
                : lga
                ? 'Update LGA'
                : 'Create LGA'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
