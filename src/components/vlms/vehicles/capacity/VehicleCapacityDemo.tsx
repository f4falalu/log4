/**
 * Demo component to test VehicleCapacityVisualizer with different configurations
 * This can be used for development/testing and removed before production
 */

import React from 'react';
import { VehicleCapacityVisualizer } from './VehicleCapacityVisualizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const VehicleCapacityDemo: React.FC = () => {
  const fillLevels = [0, 25, 50, 75, 100];
  const vehicleTypes: Array<'truck' | 'van' | 'pickup' | 'car'> = ['truck', 'van', 'pickup', 'car'];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Vehicle Capacity Visualizer Demo</h1>

      {/* Size variations */}
      <Card>
        <CardHeader>
          <CardTitle>Size Variations (Van at 59%)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Small</p>
            <VehicleCapacityVisualizer
              vehicleType="van"
              currentWeight={590}
              maxWeight={1000}
              size="sm"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Medium</p>
            <VehicleCapacityVisualizer
              vehicleType="van"
              currentWeight={590}
              maxWeight={1000}
              size="md"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Large</p>
            <VehicleCapacityVisualizer
              vehicleType="van"
              currentWeight={590}
              maxWeight={1000}
              size="lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle types at 75% */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Types (All at 75%)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehicleTypes.map((type) => (
            <div key={type} className="text-center">
              <p className="text-sm font-medium mb-2 capitalize">{type}</p>
              <VehicleCapacityVisualizer
                vehicleType={type}
                currentWeight={750}
                maxWeight={1000}
                size="md"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fill level progression (Truck) */}
      <Card>
        <CardHeader>
          <CardTitle>Fill Level Progression (Truck)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-5 gap-4">
          {fillLevels.map((level) => (
            <div key={level} className="text-center">
              <p className="text-sm font-medium mb-2">{level}%</p>
              <VehicleCapacityVisualizer
                vehicleType="truck"
                currentWeight={level * 10}
                maxWeight={1000}
                size="md"
                showMetrics={false}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weight vs Volume mode */}
      <Card>
        <CardHeader>
          <CardTitle>Display Mode: Weight vs Volume</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Auto (uses weight - 80%)</p>
            <VehicleCapacityVisualizer
              vehicleType="van"
              currentWeight={800}
              maxWeight={1000}
              currentVolume={5}
              maxVolume={10}
              displayMode="auto"
              size="md"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Weight Only</p>
            <VehicleCapacityVisualizer
              vehicleType="van"
              currentWeight={800}
              maxWeight={1000}
              displayMode="weight"
              size="md"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Volume Only</p>
            <VehicleCapacityVisualizer
              vehicleType="van"
              currentVolume={5}
              maxVolume={10}
              displayMode="volume"
              size="md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Color coding by capacity level */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Color Coding</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Underutilized (30%)</p>
            <p className="text-xs text-gray-500">Gray color</p>
            <VehicleCapacityVisualizer
              vehicleType="truck"
              currentWeight={300}
              maxWeight={1000}
              size="md"
              showMetrics={false}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Good (60%)</p>
            <p className="text-xs text-green-600">Green color</p>
            <VehicleCapacityVisualizer
              vehicleType="truck"
              currentWeight={600}
              maxWeight={1000}
              size="md"
              showMetrics={false}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Optimal (80%)</p>
            <p className="text-xs text-blue-600">Blue color</p>
            <VehicleCapacityVisualizer
              vehicleType="truck"
              currentWeight={800}
              maxWeight={1000}
              size="md"
              showMetrics={false}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Critical (95%)</p>
            <p className="text-xs text-red-600">Red color</p>
            <VehicleCapacityVisualizer
              vehicleType="truck"
              currentWeight={950}
              maxWeight={1000}
              size="md"
              showMetrics={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleCapacityDemo;
