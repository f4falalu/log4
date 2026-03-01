import { motion } from 'framer-motion';
import { Clock, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlternateRouteOption {
  id: string;
  polyline: string;
  duration: string;
  distance: string;
  isSelected: boolean;
}

interface AlternateRoutesProps {
  routes: AlternateRouteOption[];
  onRouteSelect?: (index: number) => void;
  className?: string;
}

export function AlternateRoutes({
  routes,
  onRouteSelect,
  className,
}: AlternateRoutesProps) {
  if (routes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('absolute bottom-32 left-4 right-4 z-10', className)}
    >
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {routes.map((route, index) => (
          <button
            key={route.id}
            onClick={() => onRouteSelect?.(index)}
            className={cn(
              'flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
              route.isSelected
                ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                : 'bg-background/90 backdrop-blur-sm border-border hover:border-primary/50'
            )}
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm font-semibold">{route.duration}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Route className="w-3.5 h-3.5 opacity-70" />
                <span className="text-xs opacity-70">{route.distance}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
