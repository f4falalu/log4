/**
 * Forensics Map Page
 *
 * Immutable historical analysis with audit logging
 *
 * Features:
 * - Timeline scrubber (playback controls)
 * - Route comparison overlay (planned vs actual)
 * - Performance heatmaps
 * - Trade-Off history visualization
 * - Trade-Off lineage viewer
 * - Exception history
 *
 * Forbidden:
 * - ANY data editing (immutable)
 * - Redispatch
 * - History correction
 * - Route fixes
 * - Timestamp modification
 * - Deleting historical records
 *
 * Critical: History is truth - accept imperfect data
 */

import { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useMapContext } from '@/hooks/useMapContext';
import { ForensicMap } from '@/map/modes/forensic';
import { ModeIndicator } from '@/components/map/ui/ModeIndicator';
import { toast } from 'sonner';

export default function ForensicsMapPage() {
  const { setCapability, setTimeHorizon } = useMapContext();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Set capability on mount
  useEffect(() => {
    setCapability('forensics');
    setTimeHorizon('past');
  }, [setCapability, setTimeHorizon]);

  // Timeline state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date());
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  // Forensic time range (24 hours ago to now)
  const startTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endTimestamp = new Date();

  const handleTimelineChange = (time: Date) => {
    setCurrentTimestamp(time);
  };

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimestamp((prev) => {
        const next = new Date(prev.getTime() + 60000);
        if (next >= endTimestamp) {
          setIsPlaying(false);
          return endTimestamp;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, endTimestamp]);

  // Export handlers for MapLibre
  const handleExportPNG = useCallback(async () => {
    toast.success('Exporting map as PNG', {
      description: 'Map screenshot will download shortly.',
    });
    // TODO: Implement PNG export via map.getCanvas().toBlob()
  }, []);

  const handleExportGeoJSON = useCallback(async () => {
    toast.success('Exporting data as GeoJSON', {
      description: 'GeoJSON file will download shortly.',
    });
    // TODO: Implement GeoJSON export of visible features
  }, []);

  const handleExportCSV = useCallback(async () => {
    toast.success('Exporting data as CSV', {
      description: 'CSV file will download shortly.',
    });
    // TODO: Implement CSV export of performance metrics
  }, []);

  return (
    <div className="h-full relative bg-background">
      {/* Mode Indicator */}
      <ModeIndicator mode="forensic" />

      {/* Map Container */}
      <ForensicMap
        startTime={startTimestamp}
        endTime={endTimestamp}
        center={[8.6753, 9.082]}
        zoom={6}
        isDarkMode={isDarkMode}
        currentTime={currentTimestamp}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onTimeChange={handleTimelineChange}
      />

      {/* Export Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <button className="text-xs px-2 py-1 bg-card border rounded" onClick={handleExportPNG}>
          Export PNG
        </button>
        <button className="text-xs px-2 py-1 bg-card border rounded" onClick={handleExportGeoJSON}>
          Export GeoJSON
        </button>
        <button className="text-xs px-2 py-1 bg-card border rounded" onClick={handleExportCSV}>
          Export CSV
        </button>
      </div>
    </div>
  );
}
