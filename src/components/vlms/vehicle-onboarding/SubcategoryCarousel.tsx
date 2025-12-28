/**
 * VLMS Vehicle Onboarding - Subcategory Carousel Component
 * Step 2: Select vehicle type or create custom
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, AlertCircle, Plus, Info } from 'lucide-react';
import { TypeCard } from './TypeCard';
import { useVehicleTypesByCategory } from '@/hooks/useVehicleTypes';
import { useVehicleOnboardState } from '@/hooks/useVehicleOnboardState';

export function SubcategoryCarousel() {
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');

  const selectedCategory = useVehicleOnboardState((state) => state.selectedCategory);
  const selectedType = useVehicleOnboardState((state) => state.selectedType);
  const customTypeName = useVehicleOnboardState((state) => state.customTypeName);
  const setSelectedType = useVehicleOnboardState((state) => state.setSelectedType);
  const setCustomTypeName = useVehicleOnboardState((state) => state.setCustomTypeName);
  const goToNextStep = useVehicleOnboardState((state) => state.goToNextStep);
  const goToPreviousStep = useVehicleOnboardState((state) => state.goToPreviousStep);
  const canGoNext = useVehicleOnboardState((state) => state.canGoNext());

  const { data: types, isLoading, error } = useVehicleTypesByCategory(selectedCategory?.id || '');

  const handleSelectType = (type: typeof types[0]) => {
    setSelectedType(type);
  };

  const handleCreateCustomType = () => {
    if (customTypeInput.trim()) {
      setCustomTypeName(customTypeInput.trim());
      setIsCustomDialogOpen(false);
      setCustomTypeInput('');
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      goToNextStep();
    }
  };

  if (!selectedCategory) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a category first.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load vehicle types. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Select Vehicle Type</CardTitle>
            <CardDescription>
              Choose a specific vehicle model for <strong>{selectedCategory.display_name}</strong>, or create a custom type.
            </CardDescription>
          </div>

          <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Custom Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Vehicle Type</DialogTitle>
                <DialogDescription>
                  Enter a custom name for this vehicle type. You can configure capacity details in the next step.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-type-name">Vehicle Type Name</Label>
                  <Input
                    id="custom-type-name"
                    placeholder="e.g., Toyota Hiace Custom"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCustomType();
                      }
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCustomDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCustomType} disabled={!customTypeInput.trim()}>
                  Create Type
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Custom Type Selected */}
        {customTypeName && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Custom Type:</strong> {customTypeName}
              <Button
                variant="link"
                size="sm"
                className="ml-2 h-auto p-0"
                onClick={() => setCustomTypeName('')}
              >
                Clear
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Type Selection Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : types && types.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => (
              <TypeCard
                key={type.id}
                type={type}
                isSelected={selectedType?.id === type.id}
                onSelect={() => handleSelectType(type)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">
              No predefined types available for this category.
            </p>
            <Button variant="outline" onClick={() => setIsCustomDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Type
            </Button>
          </div>
        )}

        {/* Selected Type Info */}
        {selectedType && (
          <Alert>
            <AlertDescription>
              <strong>Selected:</strong> {selectedType.name}
              {selectedType.description && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  {selectedType.description}
                </span>
              )}
              {(selectedType.default_capacity_kg || selectedType.default_capacity_m3) && (
                <span className="block mt-2 text-sm">
                  <strong>Default Capacity:</strong>{' '}
                  {selectedType.default_capacity_kg && `${selectedType.default_capacity_kg}kg`}
                  {selectedType.default_capacity_kg && selectedType.default_capacity_m3 && ' / '}
                  {selectedType.default_capacity_m3 && `${selectedType.default_capacity_m3}m³`}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canGoNext}
          size="lg"
        >
          Next: Configure Capacity
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
