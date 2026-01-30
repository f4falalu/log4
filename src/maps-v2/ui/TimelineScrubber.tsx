/**
 * TimelineScrubber.tsx — Forensic playback controls.
 *
 * Controls: Play/Pause, Speed, Seek slider.
 * Only visible in Forensic mode.
 */

import { useEffect, useRef, useState } from 'react';
import { TimelineController } from '../forensic/TimelineController';

interface TimelineScrubberProps {
  startTime: Date;
  endTime: Date;
  onTimeChange: (time: Date) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

const SPEEDS = [1, 2, 5, 10];

export function TimelineScrubber({
  startTime,
  endTime,
  onTimeChange,
  onPlayStateChange,
}: TimelineScrubberProps) {
  const controllerRef = useRef<TimelineController | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(startTime);

  useEffect(() => {
    const controller = new TimelineController(startTime, endTime);
    controllerRef.current = controller;

    const unsub = controller.subscribe((state) => {
      const p = (state.currentTime - state.startTime) / (state.endTime - state.startTime);
      setProgress(p);
      setIsPlaying(state.isPlaying);
      setCurrentTime(new Date(state.currentTime));
      onTimeChange(new Date(state.currentTime));
    });

    return () => {
      unsub();
      controller.destroy();
    };
  }, [startTime, endTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = () => {
    const controller = controllerRef.current;
    if (!controller) return;

    if (isPlaying) {
      controller.pause();
      onPlayStateChange?.(false);
    } else {
      controller.play();
      onPlayStateChange?.(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    controllerRef.current?.seekProgress(value);
  };

  const handleSpeedChange = () => {
    const nextIdx = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIdx];
    setSpeed(nextSpeed);
    controllerRef.current?.setSpeed(nextSpeed);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 rounded-lg p-3 backdrop-blur-sm border border-gray-700/50 flex items-center gap-3 min-w-[400px]">
      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors"
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="1" width="3" height="10" />
            <rect x="8" y="1" width="3" height="10" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="2,0 12,6 2,12" />
          </svg>
        )}
      </button>

      {/* Time display */}
      <span className="text-xs text-gray-400 w-16 text-center font-mono">
        {formatTime(currentTime)}
      </span>

      {/* Seek slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.001"
        value={progress}
        onChange={handleSeek}
        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />

      {/* Speed */}
      <button
        onClick={handleSpeedChange}
        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 font-mono transition-colors"
      >
        {speed}x
      </button>

      {/* Status */}
      {isPlaying && (
        <span className="text-xs text-yellow-400 animate-pulse">LOCKED</span>
      )}
    </div>
  );
}
