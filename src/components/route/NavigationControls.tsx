import { motion } from 'framer-motion';
import { Navigation, X, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavigationControlsProps {
  isNavigating: boolean;
  onStartNavigation?: () => void;
  onStopNavigation?: () => void;
  onExitNavigation?: () => void;
  onRecenter?: () => void;
  eta?: string;
  distance?: string;
}

export function NavigationControls({
  isNavigating,
  onStartNavigation,
  onStopNavigation,
  onExitNavigation,
  onRecenter,
  eta = '8 min',
  distance = '2.4 km',
}: NavigationControlsProps) {
  const [isMuted, setIsMuted] = useState(false);

  if (!isNavigating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-24 left-4 right-4 z-20"
      >
        <Button
          className="w-full h-14 text-lg font-semibold shadow-lg"
          onClick={onStartNavigation}
        >
          <Navigation className="w-5 h-5 mr-2" />
          Start Navigation
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-24 left-4 right-4 z-20"
    >
      <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border shadow-lg p-4">
        {/* ETA and distance */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-primary">{eta}</p>
            <p className="text-sm text-muted-foreground">{distance}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onRecenter}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1 h-12"
            onClick={onExitNavigation}
          >
            <X className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onStopNavigation}
          >
            Stop
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
