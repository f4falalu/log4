interface Tier {
  name: string;
  ratio: number;
  capacity_kg: number;
}

interface TierVisualizerProps {
  tiers: Tier[];
  totalCapacity: number;
}

const tierColors = ['#4CAF50', '#FFC107', '#2196F3', '#9C27B0', '#FF5722'];

export function TierVisualizer({ tiers, totalCapacity }: TierVisualizerProps) {
  const totalRatio = tiers.reduce((sum, tier) => sum + tier.ratio, 0);

  return (
    <div className="border rounded-lg p-6 bg-muted/30">
      <svg viewBox="0 0 400 200" className="w-full">
        {/* Truck outline */}
        <rect 
          x="50" 
          y="50" 
          width="300" 
          height="120" 
          fill="hsl(var(--muted))" 
          stroke="hsl(var(--border))" 
          strokeWidth="2" 
          rx="4"
        />
        
        {/* Tier segments */}
        {tiers.map((tier, idx) => {
          const yStart = 50 + (idx * (120 / tiers.length));
          const height = 120 / tiers.length;
          const color = tierColors[idx % tierColors.length];
          
          return (
            <g key={idx}>
              <rect 
                x="50" 
                y={yStart} 
                width="300" 
                height={height} 
                fill={color} 
                opacity="0.3"
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
              <text 
                x="200" 
                y={yStart + height/2} 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="text-sm font-semibold fill-foreground"
              >
                {tier.name}: {tier.ratio}% ({tier.capacity_kg.toFixed(0)}kg)
              </text>
            </g>
          );
        })}
        
        {/* Utilization badge */}
        <circle cx="350" cy="30" r="25" fill="#FF9800"/>
        <text 
          x="350" 
          y="35" 
          textAnchor="middle" 
          className="text-white font-bold text-lg fill-white"
        >
          {totalRatio}%
        </text>
      </svg>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        Tier visualization • Total capacity: {totalCapacity.toFixed(0)}kg
      </p>
    </div>
  );
}
