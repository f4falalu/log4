import React from 'react';
import { cn } from '@/lib/utils';

interface CarSilhouetteProps {
  fillPercentage: number;
  className?: string;
  fillColor?: string;
  emptyColor?: string;
}

export const CarSilhouette: React.FC<CarSilhouetteProps> = ({
  fillPercentage,
  className,
  fillColor = 'currentColor',
  emptyColor = 'currentColor',
}) => {
  const clipId = `car-clip-${Math.random().toString(36).substr(2, 9)}`;
  const viewBoxHeight = 100;
  const fillHeight = (viewBoxHeight * fillPercentage) / 100;
  const fillY = viewBoxHeight - fillHeight;

  return (
    <svg
      viewBox="0 0 200 100"
      className={cn('w-full h-full', className)}
      role="img"
      aria-label={`Car at ${fillPercentage}% capacity`}
    >
      <defs>
        {/* Clip path for fill effect */}
        <clipPath id={clipId}>
          <rect x="0" y={fillY} width="200" height={fillHeight} />
        </clipPath>
      </defs>

      {/* Empty vehicle (background) */}
      <g className="opacity-30" style={{ color: emptyColor }}>
        <CarPath />
      </g>

      {/* Filled portion */}
      <g style={{ color: fillColor }} clipPath={`url(#${clipId})`}>
        <CarPath />
      </g>
    </svg>
  );
};

const CarPath: React.FC = () => {
  return (
    <g fill="currentColor">
      {/* Main body */}
      <path d="M 45 50 L 45 65 L 180 65 L 180 50 L 170 45 L 55 45 Z" />

      {/* Roof */}
      <path d="M 65 45 L 70 35 L 120 35 L 125 45 Z" />

      {/* Windshield */}
      <path d="M 70 35 L 65 45 L 80 45 L 78 35 Z" fill="white" fillOpacity="0.3" />

      {/* Rear window */}
      <path d="M 112 35 L 125 45 L 110 45 L 110 35 Z" fill="white" fillOpacity="0.3" />

      {/* Side windows */}
      <rect x="85" y="47" width="20" height="10" rx="1" fill="white" fillOpacity="0.2" />

      {/* Front bumper */}
      <rect x="40" y="58" width="5" height="10" rx="1" />

      {/* Rear bumper */}
      <rect x="180" y="58" width="5" height="10" rx="1" />

      {/* Hood line */}
      <line x1="55" y1="45" x2="55" y2="65" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

      {/* Trunk line */}
      <line x1="130" y1="45" x2="130" y2="65" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

      {/* Wheels */}
      {/* Front wheel */}
      <circle cx="65" cy="73" r="9" fill="currentColor" />
      <circle cx="65" cy="73" r="4" fill="white" fillOpacity="0.2" />

      {/* Rear wheel */}
      <circle cx="155" cy="73" r="9" fill="currentColor" />
      <circle cx="155" cy="73" r="4" fill="white" fillOpacity="0.2" />

      {/* Door line */}
      <line x1="95" y1="48" x2="95" y2="65" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    </g>
  );
};

export default CarSilhouette;
