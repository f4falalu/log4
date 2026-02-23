import React from 'react';
import { cn } from '@/lib/utils';

interface PickupSilhouetteProps {
  fillPercentage: number;
  className?: string;
  fillColor?: string;
  emptyColor?: string;
}

export const PickupSilhouette: React.FC<PickupSilhouetteProps> = ({
  fillPercentage,
  className,
  fillColor = 'currentColor',
  emptyColor = 'currentColor',
}) => {
  const clipId = `pickup-clip-${Math.random().toString(36).substr(2, 9)}`;
  const viewBoxHeight = 100;
  const fillHeight = (viewBoxHeight * fillPercentage) / 100;
  const fillY = viewBoxHeight - fillHeight;

  return (
    <svg
      viewBox="0 0 240 100"
      className={cn('w-full h-full', className)}
      role="img"
      aria-label={`Pickup truck at ${fillPercentage}% capacity`}
    >
      <defs>
        {/* Clip path for fill effect */}
        <clipPath id={clipId}>
          <rect x="0" y={fillY} width="240" height={fillHeight} />
        </clipPath>
      </defs>

      {/* Empty vehicle (background) */}
      <g className="opacity-30" style={{ color: emptyColor }}>
        <PickupPath />
      </g>

      {/* Filled portion */}
      <g style={{ color: fillColor }} clipPath={`url(#${clipId})`}>
        <PickupPath />
      </g>
    </svg>
  );
};

const PickupPath: React.FC = () => {
  return (
    <g fill="currentColor">
      {/* Cab */}
      <path d="M 50 35 L 50 65 L 115 65 L 115 35 L 105 25 L 60 25 Z" />

      {/* Cab windows */}
      <rect x="65" y="30" width="20" height="15" rx="2" fill="white" fillOpacity="0.3" />
      <rect x="90" y="30" width="15" height="15" rx="2" fill="white" fillOpacity="0.3" />

      {/* Bed (cargo area) */}
      <rect x="120" y="40" width="100" height="25" rx="2" />

      {/* Bed walls (side panels) */}
      <rect x="120" y="38" width="3" height="27" />
      <rect x="217" y="38" width="3" height="27" />

      {/* Tailgate */}
      <rect x="218" y="42" width="2" height="20" rx="1" />

      {/* Front bumper */}
      <rect x="40" y="60" width="10" height="8" rx="1" />

      {/* Wheels */}
      {/* Front wheel */}
      <circle cx="70" cy="75" r="10" fill="currentColor" />
      <circle cx="70" cy="75" r="5" fill="white" fillOpacity="0.2" />

      {/* Rear wheel */}
      <circle cx="190" cy="75" r="10" fill="currentColor" />
      <circle cx="190" cy="75" r="5" fill="white" fillOpacity="0.2" />

      {/* Bed detail lines */}
      <line x1="140" y1="42" x2="140" y2="65" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="170" y1="42" x2="170" y2="65" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="200" y1="42" x2="200" y2="65" stroke="white" strokeOpacity="0.2" strokeWidth="1" />

      {/* Bed floor line */}
      <line x1="122" y1="63" x2="217" y2="63" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
    </g>
  );
};

export default PickupSilhouette;
