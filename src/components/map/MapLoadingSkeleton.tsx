/**
 * MapLoadingSkeleton.tsx
 *
 * Progressive loading skeleton for map initialization
 * Shows staged loading with visual feedback
 */

import { useEffect, useState } from 'react';
import { Loader2, Map as MapIcon, Layers, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MapLoadingSkeletonProps {
  /** Current loading stage */
  stage?: 'tiles' | 'layers' | 'data' | 'complete';
  /** Optional custom message */
  message?: string;
}

/**
 * Map Loading Skeleton with Progressive Stages
 */
export function MapLoadingSkeleton({ stage = 'tiles', message }: MapLoadingSkeletonProps) {
  const [progress, setProgress] = useState(0);

  // Simulate progress based on stage
  useEffect(() => {
    const stageProgress = {
      tiles: 25,
      layers: 50,
      data: 75,
      complete: 100,
    };

    const targetProgress = stageProgress[stage];
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) {
          clearInterval(interval);
          return targetProgress;
        }
        return Math.min(prev + 5, targetProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [stage]);

  const stages = [
    { id: 'tiles', label: 'Loading map tiles', icon: MapIcon },
    { id: 'layers', label: 'Initializing layers', icon: Layers },
    { id: 'data', label: 'Fetching data', icon: Zap },
  ];

  const currentStageIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md px-6">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <MapIcon className="h-16 w-16 text-primary animate-pulse" />
            <Loader2 className="h-8 w-8 text-primary/60 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="mb-6 h-2" />

        {/* Stage indicators */}
        <div className="space-y-3 mb-4">
          {stages.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStageIndex;
            const isComplete = index < currentStageIndex;

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isActive
                    ? 'opacity-100 scale-100'
                    : isComplete
                      ? 'opacity-60 scale-95'
                      : 'opacity-30 scale-90'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isComplete ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <Icon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Custom message */}
        {message && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">{message}</p>
        )}

        {/* Loading tips */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground text-center">
            {progress < 30
              ? '💡 Tip: Use clusters for better performance with many markers'
              : progress < 60
                ? '💡 Tip: Toggle representation mode for minimal or detailed view'
                : progress < 90
                  ? '💡 Tip: Click any entity to view details'
                  : '✨ Almost ready...'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal Loading Spinner (for updates)
 */
export function MapLoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{message || 'Updating...'}</span>
      </div>
    </div>
  );
}
