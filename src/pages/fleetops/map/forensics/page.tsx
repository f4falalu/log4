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

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMapContext } from '@/hooks/useMapContext';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { RouteComparisonOverlay } from '@/components/map/overlays/RouteComparisonOverlay';
import { PerformanceHeatmapLayer } from '@/components/map/layers/PerformanceHeatmapLayer';
import { TradeOffHistoryLayer } from '@/components/map/layers/TradeOffHistoryLayer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Route,
  Activity,
  GitBranch,
} from 'lucide-react';
import L from 'leaflet';

export default function ForensicsMapPage() {
  const { setCapability, setTimeHorizon } = useMapContext();

  // Set capability on mount
  useEffect(() => {
    setCapability('forensics');
    setTimeHorizon('past');
  }, [setCapability, setTimeHorizon]);

  // Data hooks (read-only historical data)
  const { data: zones = [] } = useServiceZones();
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();

  // UI state
  const [activeAnalysis, setActiveAnalysis] = useState<
    'route_comparison' | 'heatmap' | 'tradeoff_history' | null
  >(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<
    'on_time' | 'delays' | 'exceptions' | 'tradeoffs'
  >('on_time');
  const [tradeOffStatusFilter, setTradeOffStatusFilter] = useState<
    'all' | 'completed' | 'rejected' | 'cancelled'
  >('all');

  // Timeline state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date());
  const [timelinePosition, setTimelinePosition] = useState(50); // 0-100

  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleMapCapture = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  // Timeline controls
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepBackward = () => {
    setTimelinePosition((prev) => Math.max(0, prev - 5));
  };

  const handleStepForward = () => {
    setTimelinePosition((prev) => Math.min(100, prev + 5));
  };

  const handleTimelineChange = (value: number[]) => {
    setTimelinePosition(value[0]);
    // Convert timeline position to timestamp
    const now = new Date();
    const hoursAgo = ((100 - value[0]) / 100) * 24; // 24 hours range
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    setCurrentTimestamp(timestamp);
  };

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimelinePosition((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="h-full relative bg-background">
      {/* Map Container */}
      <UnifiedMapContainer
        mode="fullscreen"
        center={[9.082, 8.6753]} // Nigeria center
        zoom={6}
        zones={zones}
        facilities={facilities}
        warehouses={warehouses}
        drivers={[]}
        vehicles={[]}
        batches={[]}
        onMapReady={handleMapCapture}
      >
        {/* Conditional Forensics Layers */}
        {activeAnalysis === 'heatmap' && (
          <PerformanceHeatmapLayer
            map={mapInstanceRef.current}
            active={true}
            metric={heatmapMetric}
            timeRange={{
              start: new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000),
              end: currentTimestamp,
            }}
          />
        )}

        {activeAnalysis === 'tradeoff_history' && (
          <TradeOffHistoryLayer
            map={mapInstanceRef.current}
            active={true}
            statusFilter={tradeOffStatusFilter}
            timeRange={{
              start: new Date(currentTimestamp.getTime() - 24 * 60 * 60 * 1000),
              end: currentTimestamp,
            }}
          />
        )}
      </UnifiedMapContainer>

      {/* Analysis Tools Toolbar */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <Button
          variant={activeAnalysis === 'route_comparison' ? 'default' : 'outline'}
          size="icon"
          onClick={() =>
            setActiveAnalysis(
              activeAnalysis === 'route_comparison' ? null : 'route_comparison'
            )
          }
          title="Route Comparison"
          className="bg-card/95 backdrop-blur-sm"
        >
          <Route className="h-4 w-4" />
        </Button>

        <Button
          variant={activeAnalysis === 'heatmap' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveAnalysis(activeAnalysis === 'heatmap' ? null : 'heatmap')}
          title="Performance Heatmap"
          className="bg-card/95 backdrop-blur-sm"
        >
          <Activity className="h-4 w-4" />
        </Button>

        <Button
          variant={activeAnalysis === 'tradeoff_history' ? 'default' : 'outline'}
          size="icon"
          onClick={() =>
            setActiveAnalysis(
              activeAnalysis === 'tradeoff_history' ? null : 'tradeoff_history'
            )
          }
          title="Trade-Off History"
          className="bg-card/95 backdrop-blur-sm"
        >
          <GitBranch className="h-4 w-4" />
        </Button>
      </div>

      {/* Route Comparison Overlay */}
      {activeAnalysis === 'route_comparison' && (
        <RouteComparisonOverlay
          map={mapInstanceRef.current}
          active={true}
          batchId={selectedBatchId || undefined}
          timestamp={currentTimestamp}
          onClose={() => setActiveAnalysis(null)}
        />
      )}

      {/* Heatmap Controls */}
      {activeAnalysis === 'heatmap' && (
        <Card className="absolute top-4 right-4 z-[1000] p-4 w-80 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Performance Heatmap</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Metric
              </label>
              <Select value={heatmapMetric} onValueChange={(v: any) => setHeatmapMetric(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_time">On-Time Delivery Rate</SelectItem>
                  <SelectItem value="delays">Delay Hotspots</SelectItem>
                  <SelectItem value="exceptions">Exception Density</SelectItem>
                  <SelectItem value="tradeoffs">Trade-Off Density</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Heatmap visualizes {heatmapMetric.replace(/_/g, ' ')} across service areas during
                selected time range.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Trade-Off History Controls */}
      {activeAnalysis === 'tradeoff_history' && (
        <Card className="absolute top-4 right-4 z-[1000] p-4 w-80 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-sm">Trade-Off History</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Status Filter
              </label>
              <Select
                value={tradeOffStatusFilter}
                onValueChange={(v: any) => setTradeOffStatusFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trade-Offs</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Historical Trade-Off events with routes, handover points, and outcomes. Click
                markers for details.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Timeline Scrubber */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[900] w-[600px]">
        <Card className="p-4 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <History className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-sm">Timeline Playback</h3>
            <div className="ml-auto text-xs text-muted-foreground">
              {currentTimestamp.toLocaleString()}
            </div>
          </div>

          <div className="space-y-3">
            {/* Timeline Slider */}
            <Slider
              value={[timelinePosition]}
              onValueChange={handleTimelineChange}
              max={100}
              step={1}
              className="w-full"
            />

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleStepBackward}>
                <SkipBack className="h-3 w-3" />
              </Button>

              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>

              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleStepForward}>
                <SkipForward className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>24h ago</span>
              <span>Now</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Read-Only Reminder */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[900]">
        <div className="bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            Read-Only Mode: Historical data is immutable
          </p>
        </div>
      </div>
    </div>
  );
}
