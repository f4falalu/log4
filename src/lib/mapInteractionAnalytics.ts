/**
 * Map Interaction Analytics
 *
 * Track and analyze map user interactions for UX optimization
 * Phase 8: Governance & Scale
 *
 * Features:
 * - Interaction tracking (clicks, hovers, zooms, pans)
 * - Heatmap of user attention
 * - Feature usage statistics
 * - Performance metrics
 * - User behavior patterns
 */

import { supabase } from '@/integrations/supabase/client';
import type { MapMode } from './mapAccessControl';

/**
 * Interaction event types
 */
export type InteractionEventType =
  | 'map_load'
  | 'click'
  | 'hover'
  | 'zoom'
  | 'pan'
  | 'layer_toggle'
  | 'filter_apply'
  | 'search'
  | 'drawer_open'
  | 'drawer_close'
  | 'tool_select'
  | 'export_trigger';

/**
 * Interaction event
 */
export interface InteractionEvent {
  eventType: InteractionEventType;
  mapMode: MapMode;
  timestamp: Date;
  coordinates?: [number, number]; // [lat, lng]
  target?: string; // e.g., "vehicle", "facility", "zone"
  targetId?: string;
  metadata?: Record<string, any>;
}

/**
 * Analytics session
 */
export interface AnalyticsSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  mapMode: MapMode;
  events: InteractionEvent[];
  performance: {
    loadTime: number; // ms
    avgFps: number;
    avgResponseTime: number; // ms
  };
}

/**
 * Feature usage statistics
 */
export interface FeatureUsageStats {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  avgDuration: number; // seconds
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

/**
 * User behavior pattern
 */
export interface UserBehaviorPattern {
  userId: string;
  sessionCount: number;
  avgSessionDuration: number; // minutes
  favoriteMapMode: MapMode;
  mostUsedFeatures: string[];
  avgClicksPerSession: number;
  avgZoomsPerSession: number;
  searchFrequency: number; // searches per session
}

/**
 * Interaction heatmap data point
 */
export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-100
  eventCount: number;
}

/**
 * Map Interaction Analytics Tracker
 */
export class MapInteractionAnalytics {
  private sessionId: string;
  private userId: string | null = null;
  private mapMode: MapMode | null = null;
  private sessionStart: Date;
  private events: InteractionEvent[] = [];
  private performanceMarks: Record<string, number> = {};
  private batchQueue: InteractionEvent[] = [];
  private batchSize: number = 20;
  private flushInterval: number = 10000; // 10 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  // FPS tracking
  private frameCount: number = 0;
  private lastFrameTime: number = Date.now();
  private fpsHistory: number[] = [];

  // Response time tracking
  private responseTimeHistory: number[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.startBatchFlush();
    this.startFPSTracking();
  }

  /**
   * Set user context
   */
  setUserContext(userId: string, mapMode: MapMode): void {
    this.userId = userId;
    this.mapMode = mapMode;

    // Log map load event
    this.trackEvent({
      eventType: 'map_load',
      mapMode,
      timestamp: new Date(),
    });
  }

  /**
   * Track interaction event
   */
  trackEvent(event: InteractionEvent): void {
    if (!this.userId || !this.mapMode) {
      console.warn('[MapInteractionAnalytics] No user context set, skipping event');
      return;
    }

    this.events.push(event);
    this.batchQueue.push(event);

    // Auto-flush if batch size reached
    if (this.batchQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track click event
   */
  trackClick(
    coordinates: [number, number],
    target?: string,
    targetId?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'click',
      mapMode: this.mapMode,
      timestamp: new Date(),
      coordinates,
      target,
      targetId,
      metadata,
    });
  }

  /**
   * Track hover event
   */
  trackHover(target: string, targetId?: string): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'hover',
      mapMode: this.mapMode,
      timestamp: new Date(),
      target,
      targetId,
    });
  }

  /**
   * Track zoom event
   */
  trackZoom(newZoom: number, oldZoom: number): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'zoom',
      mapMode: this.mapMode,
      timestamp: new Date(),
      metadata: { newZoom, oldZoom, delta: newZoom - oldZoom },
    });
  }

  /**
   * Track pan event
   */
  trackPan(newCenter: [number, number], oldCenter: [number, number]): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'pan',
      mapMode: this.mapMode,
      timestamp: new Date(),
      coordinates: newCenter,
      metadata: { oldCenter },
    });
  }

  /**
   * Track layer toggle
   */
  trackLayerToggle(layerName: string, visible: boolean): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'layer_toggle',
      mapMode: this.mapMode,
      timestamp: new Date(),
      target: layerName,
      metadata: { visible },
    });
  }

  /**
   * Track search query
   */
  trackSearch(query: string, resultsCount: number): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'search',
      mapMode: this.mapMode,
      timestamp: new Date(),
      metadata: { query, resultsCount },
    });
  }

  /**
   * Track tool selection
   */
  trackToolSelect(toolName: string): void {
    if (!this.mapMode) return;

    this.trackEvent({
      eventType: 'tool_select',
      mapMode: this.mapMode,
      timestamp: new Date(),
      target: toolName,
    });
  }

  /**
   * Track response time (e.g., API calls, layer rendering)
   */
  trackResponseTime(operation: string, durationMs: number): void {
    this.responseTimeHistory.push(durationMs);

    // Keep only last 100 measurements
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift();
    }
  }

  /**
   * Mark performance checkpoint
   */
  markPerformance(label: string): void {
    this.performanceMarks[label] = performance.now();
  }

  /**
   * Measure performance between two marks
   */
  measurePerformance(startLabel: string, endLabel: string): number {
    const start = this.performanceMarks[startLabel];
    const end = this.performanceMarks[endLabel];

    if (start === undefined || end === undefined) {
      console.warn(`[MapInteractionAnalytics] Missing performance marks: ${startLabel}, ${endLabel}`);
      return 0;
    }

    return end - start;
  }

  /**
   * Get current session summary
   */
  getSessionSummary(): AnalyticsSession {
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
      : 0;

    const avgResponseTime = this.responseTimeHistory.length > 0
      ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
      : 0;

    const loadTime = this.measurePerformance('map_start', 'map_ready') || 0;

    return {
      sessionId: this.sessionId,
      userId: this.userId!,
      startTime: this.sessionStart,
      endTime: new Date(),
      mapMode: this.mapMode!,
      events: [...this.events],
      performance: {
        loadTime,
        avgFps: Math.round(avgFps),
        avgResponseTime: Math.round(avgResponseTime),
      },
    };
  }

  /**
   * Get feature usage statistics
   */
  async getFeatureUsageStats(): Promise<FeatureUsageStats[]> {
    try {
      const { data, error } = await supabase.rpc('get_feature_usage_stats');

      if (error) throw error;

      return (data || []).map((row: any) => ({
        feature: row.feature,
        usageCount: row.usage_count,
        uniqueUsers: row.unique_users,
        avgDuration: row.avg_duration,
        last24Hours: row.last_24_hours,
        last7Days: row.last_7_days,
        last30Days: row.last_30_days,
      }));
    } catch (err) {
      console.error('[MapInteractionAnalytics] Error fetching feature stats:', err);
      return [];
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehaviorPattern(userId: string): Promise<UserBehaviorPattern | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_behavior_pattern', {
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0];
      return {
        userId: row.user_id,
        sessionCount: row.session_count,
        avgSessionDuration: row.avg_session_duration,
        favoriteMapMode: row.favorite_map_mode,
        mostUsedFeatures: row.most_used_features || [],
        avgClicksPerSession: row.avg_clicks_per_session,
        avgZoomsPerSession: row.avg_zooms_per_session,
        searchFrequency: row.search_frequency,
      };
    } catch (err) {
      console.error('[MapInteractionAnalytics] Error fetching user behavior:', err);
      return null;
    }
  }

  /**
   * Get interaction heatmap data
   */
  async getInteractionHeatmap(
    mapMode: MapMode,
    startDate?: Date,
    endDate?: Date
  ): Promise<HeatmapDataPoint[]> {
    try {
      const { data, error } = await supabase.rpc('get_interaction_heatmap', {
        p_map_mode: mapMode,
        p_start_date: startDate?.toISOString(),
        p_end_date: endDate?.toISOString(),
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        lat: row.lat,
        lng: row.lng,
        intensity: row.intensity,
        eventCount: row.event_count,
      }));
    } catch (err) {
      console.error('[MapInteractionAnalytics] Error fetching heatmap:', err);
      return [];
    }
  }

  /**
   * Flush batch queue to database
   */
  private async flush(): Promise<void> {
    if (this.batchQueue.length === 0 || !this.userId || !this.mapMode) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const inserts = batch.map((event) => ({
        session_id: this.sessionId,
        user_id: this.userId,
        map_mode: this.mapMode,
        event_type: event.eventType,
        timestamp: event.timestamp.toISOString(),
        coordinates: event.coordinates
          ? `POINT(${event.coordinates[1]} ${event.coordinates[0]})` // PostGIS format
          : null,
        target: event.target,
        target_id: event.targetId,
        metadata: event.metadata,
      }));

      const { error } = await supabase.from('map_interaction_events').insert(inserts);

      if (error) {
        console.error('[MapInteractionAnalytics] Error flushing batch:', error);
        // Re-add to queue for retry
        this.batchQueue.unshift(...batch);
      }
    } catch (err) {
      console.error('[MapInteractionAnalytics] Error flushing batch:', err);
      this.batchQueue.unshift(...batch);
    }
  }

  /**
   * Start automatic batch flush timer
   */
  private startBatchFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop automatic batch flush timer
   */
  stopBatchFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Start FPS tracking
   */
  private startFPSTracking(): void {
    const trackFrame = () => {
      this.frameCount++;
      const now = Date.now();
      const elapsed = now - this.lastFrameTime;

      // Calculate FPS every second
      if (elapsed >= 1000) {
        const fps = (this.frameCount / elapsed) * 1000;
        this.fpsHistory.push(fps);

        // Keep only last 60 seconds of FPS data
        if (this.fpsHistory.length > 60) {
          this.fpsHistory.shift();
        }

        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      requestAnimationFrame(trackFrame);
    };

    requestAnimationFrame(trackFrame);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * End session and flush all events
   */
  async endSession(): Promise<void> {
    this.stopBatchFlush();
    await this.flush();

    // Save session summary
    const summary = this.getSessionSummary();

    try {
      await supabase.from('map_analytics_sessions').insert({
        session_id: summary.sessionId,
        user_id: summary.userId,
        map_mode: summary.mapMode,
        start_time: summary.startTime.toISOString(),
        end_time: summary.endTime?.toISOString(),
        event_count: summary.events.length,
        load_time_ms: summary.performance.loadTime,
        avg_fps: summary.performance.avgFps,
        avg_response_time_ms: summary.performance.avgResponseTime,
      });
    } catch (err) {
      console.error('[MapInteractionAnalytics] Error saving session summary:', err);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.endSession();
  }
}

/**
 * Singleton instance
 */
export const mapInteractionAnalytics = new MapInteractionAnalytics();
