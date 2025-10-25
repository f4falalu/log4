import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineScrubberProps {
  mode: 'live' | 'playback';
  currentTime: Date;
  shiftStart: Date;
  shiftEnd: Date;
  onTimeChange: (time: Date) => void;
  onModeToggle: () => void;
}

export function TimelineScrubber({
  mode,
  currentTime,
  shiftStart,
  shiftEnd,
  onTimeChange,
  onModeToggle
}: TimelineScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const timeToValue = (time: Date) => {
    return (time.getTime() - shiftStart.getTime()) / 60000; // minutes since shift start
  };
  
  const valueToTime = (value: number) => {
    return new Date(shiftStart.getTime() + value * 60000);
  };
  
  const currentValue = timeToValue(currentTime);
  const maxValue = timeToValue(shiftEnd);
  
  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleSkipBack = () => {
    const newTime = new Date(currentTime.getTime() - 300000); // -5 minutes
    if (newTime >= shiftStart) {
      onTimeChange(newTime);
    }
  };
  
  const handleSkipForward = () => {
    const newTime = new Date(currentTime.getTime() + 300000); // +5 minutes
    if (newTime <= shiftEnd) {
      onTimeChange(newTime);
    }
  };
  
  // Playback effect
  useEffect(() => {
    if (!isPlaying || mode !== 'playback') return;
    
    const interval = setInterval(() => {
      const nextTime = new Date(currentTime.getTime() + 60000); // +1 minute
      if (nextTime > shiftEnd) {
        setIsPlaying(false);
        return;
      }
      onTimeChange(nextTime);
    }, 1000); // 1 second real time = 1 minute simulation time
    
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, mode, shiftEnd, onTimeChange]);
  
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-muted/30 rounded-lg border border-border">
      {/* Playback Controls */}
      <div className="flex gap-1">
        <Button 
          size="icon" 
          variant="ghost"
          onClick={handleSkipBack}
          disabled={currentTime <= shiftStart || mode === 'live'}
          className="h-8 w-8"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button 
          size="icon" 
          variant={isPlaying ? 'default' : 'ghost'}
          onClick={handlePlay}
          disabled={mode === 'live'}
          className="h-8 w-8"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <Button 
          size="icon" 
          variant="ghost"
          onClick={handleSkipForward}
          disabled={currentTime >= shiftEnd || mode === 'live'}
          className="h-8 w-8"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Timeline Slider */}
      <div className="flex-1">
        <Slider
          value={[currentValue]}
          min={0}
          max={maxValue}
          step={5}
          onValueChange={([value]) => onTimeChange(valueToTime(value))}
          disabled={mode === 'live'}
          className={cn(
            "cursor-pointer",
            mode === 'live' && "opacity-50"
          )}
        />
      </div>
      
      {/* Time Display */}
      <div className="text-sm font-mono text-muted-foreground min-w-[80px] text-right">
        {currentTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
      
      {/* Mode Toggle */}
      <Button 
        size="sm" 
        variant={mode === 'playback' ? 'default' : 'outline'}
        onClick={onModeToggle}
        className="min-w-[90px]"
      >
        {mode === 'live' ? 'Playback' : 'Live'}
      </Button>
    </div>
  );
}
