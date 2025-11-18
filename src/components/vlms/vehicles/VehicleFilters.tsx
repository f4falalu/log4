'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleFilters as VehicleFiltersType } from '@/types/vlms';
import { useFacilities } from '@/hooks/useFacilities';
import { X } from 'lucide-react';

interface VehicleFiltersProps {
  filters: VehicleFiltersType;
  onFiltersChange: (filters: Partial<VehicleFiltersType>) => void;
  onClearFilters: () => void;
}

export function VehicleFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: VehicleFiltersProps) {
  const { data: facilities } = useFacilities();

  const hasActiveFilters =
    Object.keys(filters).length > 0 && Object.values(filters).some((v) => v);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Filters</CardTitle>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Make, model, plate, VIN..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ status: value === 'all' ? undefined : (value as any) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Vehicle Type */}
        <div className="space-y-2">
          <Label htmlFor="vehicle_type">Vehicle Type</Label>
          <Select
            value={filters.vehicle_type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ vehicle_type: value === 'all' ? undefined : (value as any) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sedan">Sedan</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fuel Type */}
        <div className="space-y-2">
          <Label htmlFor="fuel_type">Fuel Type</Label>
          <Select
            value={filters.fuel_type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ fuel_type: value === 'all' ? undefined : (value as any) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All fuel types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fuel Types</SelectItem>
              <SelectItem value="gasoline">Gasoline</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="electric">Electric</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="cng">CNG</SelectItem>
              <SelectItem value="lpg">LPG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select
            value={filters.current_location_id || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ current_location_id: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {facilities?.map((facility) => (
                <SelectItem key={facility.id} value={facility.id}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Acquisition Type */}
        <div className="space-y-2">
          <Label htmlFor="acquisition_type">Acquisition Type</Label>
          <Select
            value={filters.acquisition_type || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ acquisition_type: value === 'all' ? undefined : (value as any) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="lease">Lease</SelectItem>
              <SelectItem value="donation">Donation</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Year Range */}
        <div className="space-y-2">
          <Label>Year Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="From"
              value={filters.year_from || ''}
              onChange={(e) =>
                onFiltersChange({
                  year_from: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
            <Input
              type="number"
              placeholder="To"
              value={filters.year_to || ''}
              onChange={(e) =>
                onFiltersChange({
                  year_to: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        {/* Make */}
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <Input
            id="make"
            placeholder="Toyota, Honda..."
            value={filters.make || ''}
            onChange={(e) => onFiltersChange({ make: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
