import React from 'react';
import { cn } from '@/lib/utils';

interface TruckSilhouetteProps {
  fillPercentage: number;
  className?: string;
  fillColor?: string;
  emptyColor?: string;
}

export const TruckSilhouette: React.FC<TruckSilhouetteProps> = ({
  fillPercentage,
  className,
  fillColor = 'currentColor',
  emptyColor = 'currentColor',
}) => {
  const clipId = `truck-clip-${Math.random().toString(36).substr(2, 9)}`;
  const viewBoxHeight = 100;
  const fillHeight = (viewBoxHeight * fillPercentage) / 100;
  const fillY = viewBoxHeight - fillHeight;

  return (
    <svg
      viewBox="0 0 300 100"
      className={cn('w-full h-full', className)}
      role="img"
      aria-label={`Truck at ${fillPercentage}% capacity`}
    >
      <defs>
        {/* Clip path for fill effect */}
        <clipPath id={clipId}>
          <rect x="0" y={fillY} width="300" height={fillHeight} />
        </clipPath>
      </defs>

      {/* Empty vehicle (background) */}
      <g className="opacity-30" style={{ color: emptyColor }}>
        <TruckPath />
      </g>

      {/* Filled portion */}
      <g style={{ color: fillColor }} clipPath={`url(#${clipId})`}>
        <TruckPath />
      </g>
    </svg>
  );
};

const TruckPath: React.FC = () => {
  return (
    <g fill="currentColor">
      {/* Trailer (main cargo area) */}
      <rect x="100" y="25" width="180" height="50" rx="2" />

      {/* Trailer roof detail */}
      <rect x="105" y="20" width="170" height="5" rx="1" />

      {/* Cab */}
      <path d="M 60 35 L 60 75 L 105 75 L 105 35 L 95 25 L 70 25 Z" />

      {/* Cab window */}
      <rect x="75" y="30" width="20" height="15" rx="1" fill="white" fillOpacity="0.3" />

      {/* Front bumper */}
      <rect x="55" y="70" width="5" height="8" rx="1" />

      {/* Wheels */}
      {/* Cab front wheel */}
      <circle cx="75" cy="80" r="8" fill="currentColor" />
      <circle cx="75" cy="80" r="4" fill="white" fillOpacity="0.2" />

      {/* Cab rear wheel */}
      <circle cx="95" cy="80" r="8" fill="currentColor" />
      <circle cx="95" cy="80" r="4" fill="white" fillOpacity="0.2" />

      {/* Trailer front wheels (dual) */}
      <circle cx="130" cy="80" r="8" fill="currentColor" />
      <circle cx="130" cy="80" r="4" fill="white" fillOpacity="0.2" />
      <circle cx="145" cy="80" r="8" fill="currentColor" />
      <circle cx="145" cy="80" r="4" fill="white" fillOpacity="0.2" />

      {/* Trailer rear wheels (dual) */}
      <circle cx="250" cy="80" r="8" fill="currentColor" />
      <circle cx="250" cy="80" r="4" fill="white" fillOpacity="0.2" />
      <circle cx="265" cy="80" r="8" fill="currentColor" />
      <circle cx="265" cy="80" r="4" fill="white" fillOpacity="0.2" />

      {/* Trailer connection */}
      <rect x="98" y="45" width="4" height="15" rx="1" />

      {/* Cargo door lines (details) */}
      <line x1="190" y1="30" x2="190" y2="75" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="230" y1="30" x2="230" y2="75" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
    </g>
  );
};

export default TruckSilhouette;
