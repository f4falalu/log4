/**
 * =====================================================
 * Mini Map Preview
 * =====================================================
 * Placeholder for map preview component.
 * Will be implemented with MapLibre when needed.
 */

import * as React from 'react';
import { Map, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniMapPreviewProps {
  points?: Array<{ lat: number; lng: number; name?: string }>;
  className?: string;
}

export function MiniMapPreview({ points = [], className }: MiniMapPreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[4/3] bg-muted rounded-lg flex items-center justify-center border border-dashed',
        className
      )}
    >
      {points.length === 0 ? (
        <div className="text-center text-muted-foreground">
          <Route className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Add facilities to see route preview</p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Map preview</p>
          <p className="text-xs font-medium mt-1">{points.length} points</p>
        </div>
      )}
    </div>
  );
}

export default MiniMapPreview;
