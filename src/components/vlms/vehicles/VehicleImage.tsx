/**
 * VehicleImage Component
 * Reusable vehicle image with fallback and AI-generated indicator
 * Supports lazy loading and responsive sizing
 */

import React from 'react';
import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface VehicleImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aiGenerated?: boolean;
  fallbackClassName?: string;
  showAiBadge?: boolean;
  loading?: 'eager' | 'lazy';
}

export function VehicleImage({
  src,
  alt,
  className,
  aiGenerated = false,
  fallbackClassName,
  showAiBadge = true,
  loading = 'lazy',
}: VehicleImageProps) {
  const [imageError, setImageError] = React.useState(false);

  // Show fallback if no src or image failed to load
  const showFallback = !src || imageError;

  if (showFallback) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted/30 border border-border',
          fallbackClassName,
          className
        )}
      >
        <Car className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setImageError(true)}
        className="w-full h-full object-cover"
      />
      {aiGenerated && showAiBadge && (
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-primary/90 text-primary-foreground"
        >
          AI
        </Badge>
      )}
    </div>
  );
}
