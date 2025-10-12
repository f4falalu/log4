import { cn } from '@/lib/utils';

interface VehicleIllustrationProps {
  type: 'truck' | 'van' | 'pickup' | 'car';
  className?: string;
  size?: number;
}

export const VehicleIllustration = ({ type, className, size = 120 }: VehicleIllustrationProps) => {
  const illustrations = {
    truck: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Cargo container */}
        <rect x="40" y="30" width="90" height="50" fill="hsl(var(--primary))" opacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2" rx="4"/>
        <rect x="45" y="35" width="80" height="40" fill="hsl(var(--primary))" opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="1.5" rx="2"/>
        {/* Lines on container */}
        <line x1="65" y1="35" x2="65" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"/>
        <line x1="85" y1="35" x2="85" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"/>
        <line x1="105" y1="35" x2="105" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"/>
        
        {/* Cabin */}
        <path d="M 130 40 L 160 40 L 165 55 L 165 80 L 130 80 Z" fill="hsl(var(--primary))" opacity="0.3" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <rect x="135" y="45" width="15" height="12" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1" rx="1"/>
        
        {/* Wheels */}
        <circle cx="60" cy="85" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="60" cy="85" r="6" fill="hsl(var(--background))"/>
        <circle cx="110" cy="85" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="110" cy="85" r="6" fill="hsl(var(--background))"/>
        <circle cx="150" cy="85" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="150" cy="85" r="6" fill="hsl(var(--background))"/>
      </svg>
    ),
    van: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <rect x="50" y="35" width="100" height="40" fill="hsl(var(--primary))" opacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2" rx="4"/>
        
        {/* Front cabin */}
        <path d="M 140 35 L 155 35 L 160 50 L 160 75 L 140 75 Z" fill="hsl(var(--primary))" opacity="0.3" stroke="hsl(var(--primary))" strokeWidth="2"/>
        
        {/* Windows */}
        <rect x="55" y="40" width="25" height="15" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1" rx="2"/>
        <rect x="85" y="40" width="25" height="15" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1" rx="2"/>
        <rect x="115" y="40" width="20" height="15" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1" rx="2"/>
        <rect x="145" y="40" width="10" height="12" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1" rx="1"/>
        
        {/* Details */}
        <line x1="50" y1="60" x2="140" y2="60" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"/>
        
        {/* Wheels */}
        <circle cx="75" cy="80" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="75" cy="80" r="6" fill="hsl(var(--background))"/>
        <circle cx="140" cy="80" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="140" cy="80" r="6" fill="hsl(var(--background))"/>
      </svg>
    ),
    pickup: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Open bed */}
        <rect x="45" y="40" width="70" height="35" fill="hsl(var(--primary))" opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="2" rx="2"/>
        <line x1="45" y1="65" x2="115" y2="65" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.3"/>
        <line x1="70" y1="40" x2="70" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"/>
        <line x1="90" y1="40" x2="90" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3"/>
        
        {/* Cabin */}
        <path d="M 115 45 L 145 45 L 150 55 L 150 75 L 115 75 Z" fill="hsl(var(--primary))" opacity="0.3" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <rect x="120" y="50" width="20" height="12" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1" rx="1"/>
        
        {/* Wheels */}
        <circle cx="70" cy="80" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="70" cy="80" r="6" fill="hsl(var(--background))"/>
        <circle cx="130" cy="80" r="12" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="130" cy="80" r="6" fill="hsl(var(--background))"/>
      </svg>
    ),
    car: (
      <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <path d="M 60 55 L 75 40 L 125 40 L 140 55 L 140 70 L 60 70 Z" fill="hsl(var(--primary))" opacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <rect x="55" y="55" width="90" height="15" fill="hsl(var(--primary))" opacity="0.3" stroke="hsl(var(--primary))" strokeWidth="2" rx="2"/>
        
        {/* Windows */}
        <path d="M 80 42 L 90 42 L 95 50 L 85 50 Z" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1"/>
        <path d="M 110 42 L 120 42 L 115 50 L 105 50 Z" fill="hsl(var(--background))" opacity="0.5" stroke="hsl(var(--primary))" strokeWidth="1"/>
        
        {/* Details */}
        <line x1="100" y1="40" x2="100" y2="50" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4"/>
        
        {/* Wheels */}
        <circle cx="75" cy="75" r="10" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="75" cy="75" r="5" fill="hsl(var(--background))"/>
        <circle cx="125" cy="75" r="10" fill="hsl(var(--foreground))" opacity="0.8" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="125" cy="75" r="5" fill="hsl(var(--background))"/>
      </svg>
    )
  };

  return (
    <div className={cn("flex items-center justify-center", className)} style={{ width: size, height: size * 0.6 }}>
      {illustrations[type]}
    </div>
  );
};
