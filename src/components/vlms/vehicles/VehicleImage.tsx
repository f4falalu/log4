/**
 * VehicleImage Component
 * Reusable vehicle image with fallback and AI-generated indicator
 * Supports lazy loading and responsive sizing
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/ui/lazy-image';
import { getVehicleSilhouette } from '@/lib/vehicleUtils';

interface VehicleImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aiGenerated?: boolean;
  fallbackClassName?: string;
  showAiBadge?: boolean;
  loading?: 'eager' | 'lazy';
  vehicleType?: string | null;
  make?: string | null;
  model?: string | null;
}

export function VehicleImage({
  src,
  alt,
  className,
  aiGenerated = false,
  fallbackClassName,
  showAiBadge = true,
  loading = 'lazy',
  vehicleType,
  make,
  model,
}: VehicleImageProps) {
  // Fallback component for missing/failed images
  const FallbackComponent = () => {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden',
          fallbackClassName,
          className
        )}
      >
        <img
          src={getVehicleSilhouette(vehicleType, make, model)}
          alt={`${model || make || 'vehicle'} silhouette`}
          className="object-contain h-full w-full p-4"
        />
      </div>
    );
  };

  // No src provided - show fallback immediately
  if (!src) {
    return <FallbackComponent />;
  }

  return (
    <div className={cn('relative', className)}>
      <LazyImage
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        threshold={0.1}
        rootMargin="50px"
        FallbackComponent={FallbackComponent}
      />
      {aiGenerated && showAiBadge && (
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-primary/90 text-primary-foreground z-10"
        >
          AI
        </Badge>
      )}
    </div>
  );
}
