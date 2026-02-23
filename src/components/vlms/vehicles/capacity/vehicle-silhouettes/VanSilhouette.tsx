import React from 'react';
import { cn } from '@/lib/utils';

interface VanSilhouetteProps {
  fillPercentage: number;
  className?: string;
  fillColor?: string;
  emptyColor?: string;
}

export const VanSilhouette: React.FC<VanSilhouetteProps> = ({
  fillPercentage,
  className,
  fillColor = 'currentColor',
  emptyColor = 'currentColor',
}) => {
  const clipId = `van-clip-${Math.random().toString(36).substr(2, 9)}`;
  const viewBoxHeight = 100;
  const fillHeight = (viewBoxHeight * fillPercentage) / 100;
  const fillY = viewBoxHeight - fillHeight;

  return (
    <svg
      viewBox="0 0 220 100"
      className={cn('w-full h-full', className)}
      role="img"
      aria-label={`Van at ${fillPercentage}% capacity`}
    >
      <defs>
        {/* Clip path for fill effect */}
        <clipPath id={clipId}>
          <rect x="0" y={fillY} width="220" height={fillHeight} />
        </clipPath>
      </defs>

      {/* Empty vehicle (background) */}
      <g className="opacity-30" style={{ color: emptyColor }}>
        <VanPath />
      </g>

      {/* Filled portion */}
      <g style={{ color: fillColor }} clipPath={`url(#${clipId})`}>
        <VanPath />
      </g>
    </svg>
  );
};

const VanPath: React.FC = () => {
  return (
    <g fill="currentColor">
      {/* Main cargo body */}
      <rect x="60" y="30" width="140" height="45" rx="3" />

      {/* Roof */}
      <path d="M 60 30 L 70 20 L 190 20 L 200 30 Z" />

      {/* Front cab windshield */}
      <path d="M 50 35 L 60 30 L 60 55 L 50 60 Z" />

      {/* Front bumper */}
      <rect x="40" y="55" width="10" height="10" rx="1" />

      {/* Side window details */}
      <rect x="75" y="25" width="30" height="12" rx="2" fill="white" fillOpacity="0.3" />
      <rect x="120" y="35" width="35" height="20" rx="2" fill="white" fillOpacity="0.2" />
      <rect x="165" y="35" width="25" height="20" rx="2" fill="white" fillOpacity="0.2" />

      {/* Wheels */}
      {/* Front wheel */}
      <circle cx="75" cy="80" r="10" fill="currentColor" />
      <circle cx="75" cy="80" r="5" fill="white" fillOpacity="0.2" />

      {/* Rear wheel */}
      <circle cx="180" cy="80" r="10" fill="currentColor" />
      <circle cx="180" cy="80" r="5" fill="white" fillOpacity="0.2" />

      {/* Side panel lines */}
      <line x1="100" y1="35" x2="100" y2="75" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="155" y1="35" x2="155" y2="75" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

      {/* Back door handle */}
      <rect x="195" y="50" width="3" height="8" rx="1" fill="white" fillOpacity="0.3" />
    </g>
  );
};

export default VanSilhouette;
