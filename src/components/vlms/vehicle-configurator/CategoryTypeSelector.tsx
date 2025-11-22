/**
 * Category & Type Selector Component
 * Combined category and vehicle type selection for the configurator
 */

import React, { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useVehicleCategories } from '@/hooks/useVehicleCategories';
import { useVehicleTypesByCategory } from '@/hooks/useVehicleTypes';
import type { VehicleCategory, VehicleType } from '@/types/vlms-onboarding';

interface CategoryTypeSelectorProps {
  selectedCategory: VehicleCategory | null;
  selectedType: VehicleType | null;
  modelName: string;
  onCategoryChange: (category: VehicleCategory | null) => void;
  onTypeChange: (type: VehicleType | null) => void;
  onModelNameChange: (name: string) => void;
}

export function CategoryTypeSelector({
  selectedCategory,
  selectedType,
  modelName,
  onCategoryChange,
  onTypeChange,
  onModelNameChange,
}: CategoryTypeSelectorProps) {
  const { data: categories, isLoading: categoriesLoading } = useVehicleCategories();
  const { data: vehicleTypes, isLoading: typesLoading } = useVehicleTypesByCategory(
    selectedCategory?.id
  );

  // Reset type when category changes
  useEffect(() => {
    if (selectedCategory && selectedType) {
      // Check if selected type belongs to new category
      const typeExists = vehicleTypes?.some(t => t.id === selectedType.id);
      if (!typeExists) {
        onTypeChange(null);
      }
    }
  }, [selectedCategory, selectedType, vehicleTypes, onTypeChange]);

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-2">
        <Label htmlFor="category">Vehicle Category</Label>
        <Select
          value={selectedCategory?.id || ''}
          onValueChange={(value) => {
            const category = categories?.find(c => c.id === value);
            onCategoryChange(category || null);
          }}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select vehicle category..." />
          </SelectTrigger>
          <SelectContent>
            {categoriesLoading ? (
              <SelectItem value="loading" disabled>
                Loading categories...
              </SelectItem>
            ) : categories && categories.length > 0 ? (
              <>
                {/* Group by source */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  EU Standard Categories
                </div>
                {categories
                  .filter(c => c.source === 'eu')
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                          {category.code}
                        </span>
                        <span>{category.display_name || category.name}</span>
                      </div>
                    </SelectItem>
                  ))}

                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                  BIKO Quick Select
                </div>
                {categories
                  .filter(c => c.source === 'biko')
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-orange-100 px-1.5 py-0.5 rounded">
                          BIKO
                        </span>
                        <span>{category.display_name || category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </>
            ) : (
              <SelectItem value="none" disabled>
                No categories available
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {selectedCategory?.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {selectedCategory.description}
          </p>
        )}
      </div>

      {/* Vehicle Type Selection */}
      {selectedCategory && (
        <div className="space-y-2">
          <Label htmlFor="vehicle-type">Vehicle Type</Label>
          <Select
            value={selectedType?.id || ''}
            onValueChange={(value) => {
              const type = vehicleTypes?.find(t => t.id === value);
              onTypeChange(type || null);
            }}
            disabled={!selectedCategory}
          >
            <SelectTrigger id="vehicle-type">
              <SelectValue placeholder="Select vehicle type..." />
            </SelectTrigger>
            <SelectContent>
              {typesLoading ? (
                <SelectItem value="loading" disabled>
                  Loading types...
                </SelectItem>
              ) : vehicleTypes && vehicleTypes.length > 0 ? (
                vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span>{type.name}</span>
                      {(type.default_capacity_m3 || type.default_capacity_kg) && (
                        <span className="text-xs text-muted-foreground">
                          {type.default_capacity_m3 && `${type.default_capacity_m3} m³`}
                          {type.default_capacity_m3 && type.default_capacity_kg && ' • '}
                          {type.default_capacity_kg && `${type.default_capacity_kg} kg`}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No types available for this category
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedType?.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {selectedType.description}
            </p>
          )}
        </div>
      )}

      {/* Model Name Input */}
      {selectedCategory && (
        <div className="space-y-2">
          <Label htmlFor="model-name">
            Vehicle Model <span className="text-muted-foreground text-xs">(Optional)</span>
          </Label>
          <Input
            id="model-name"
            type="text"
            placeholder="e.g., Toyota Hiace, Mazda E2000..."
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the specific make and model for this vehicle
          </p>
        </div>
      )}
    </div>
  );
}
