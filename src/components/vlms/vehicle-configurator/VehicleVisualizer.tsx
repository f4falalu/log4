/**
 * Vehicle Visualizer Component
 * Displays vehicle silhouette with cargo area highlighting and dimensional annotations
 */

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import {
  getVehicleSilhouette,
  checkSilhouetteExists,
  getCargoAreaDimensions,
} from '@/lib/vlms/vehicleSilhouettes';
import { cn } from '@/lib/utils';

interface VehicleVisualizerProps {
  categoryCode: string | null;
  dimensions?: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    volume_m3?: number;
  };
  className?: string;
}

export function VehicleVisualizer({
  categoryCode,
  dimensions,
  className,
}: VehicleVisualizerProps) {
  const [imageExists, setImageExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const silhouetteInfo = getVehicleSilhouette(categoryCode);
  const cargoArea = categoryCode ? getCargoAreaDimensions(categoryCode) : null;

  // Check if silhouette image exists
  useEffect(() => {
    if (!categoryCode) {
      setImageExists(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    checkSilhouetteExists(silhouetteInfo.path)
      .then((exists) => {
        setImageExists(exists);
        setIsLoading(false);
      })
      .catch(() => {
        setImageExists(false);
        setIsLoading(false);
      });
  }, [categoryCode, silhouetteInfo.path]);

  // Format dimensions for display
  const dimensionText = dimensions?.length_cm && dimensions?.width_cm && dimensions?.height_cm
    ? `${dimensions.length_cm} × ${dimensions.width_cm} × ${dimensions.height_cm} cm`
    : null;

  const volumeText = dimensions?.volume_m3
    ? `${dimensions.volume_m3.toFixed(2)} m³`
    : null;

  if (!categoryCode) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-full min-h-[400px] bg-muted/20 rounded-lg border-2 border-dashed',
        className
      )}>
        <Truck className="w-24 h-24 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">Select a vehicle category to preview</p>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full min-h-[400px] bg-white rounded-lg p-6', className)}>
      {/* Vehicle Silhouette */}
      <div className="relative w-full h-[300px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : imageExists ? (
          <div className="relative w-full h-full">
            {/* Main silhouette */}
            <img
              src={silhouetteInfo.path}
              alt={`${categoryCode} vehicle silhouette`}
              className="w-full h-full object-contain filter grayscale"
              style={{ opacity: 0.7 }}
            />

            {/* Cargo area highlight overlay */}
            {cargoArea && cargoArea.widthPercent > 0 && (
              <div
                className="absolute top-0 bottom-0 bg-orange-400/30 border-2 border-orange-500/50 rounded transition-all duration-300"
                style={{
                  left: `${cargoArea.offsetPercent}%`,
                  width: `${cargoArea.widthPercent}%`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-500/20"></div>
              </div>
            )}
          </div>
        ) : (
          /* Fallback to Lucide icon */
          <div className="flex flex-col items-center">
            <Truck className="w-32 h-32 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground mt-2">Preview not available</p>
          </div>
        )}
      </div>

      {/* Dimensional Annotations */}
      {dimensionText && (
        <div className="mt-6 space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cargo Dimensions</span>
            <span className="font-medium">{dimensionText}</span>
          </div>

          {volumeText && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cargo Volume</span>
              <span className="font-semibold text-lg text-primary">{volumeText}</span>
            </div>
          )}
        </div>
      )}

      {/* Category Badge */}
      <div className="absolute top-4 right-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          {categoryCode}
        </div>
      </div>
    </div>
  );
}
