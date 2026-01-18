/**
 * ETA Prediction Model
 *
 * Machine learning-based ETA prediction using historical route data
 * Phase 7: Intelligence & Knowledge Graph
 *
 * Features:
 * - Historical pattern analysis
 * - Traffic condition integration
 * - Weather impact consideration
 * - Real-time adjustment
 * - Confidence scoring
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Route segment for ETA calculation
 */
export interface RouteSegment {
  fromFacilityId: string;
  toFacilityId: string;
  distance: number; // meters
  expectedDuration: number; // seconds
}

/**
 * Traffic conditions
 */
export type TrafficCondition = 'light' | 'moderate' | 'heavy' | 'severe';

/**
 * Weather conditions
 */
export type WeatherCondition = 'clear' | 'rain' | 'heavy_rain' | 'storm';

/**
 * Time of day impact
 */
export type TimeOfDay = 'early_morning' | 'morning_rush' | 'midday' | 'evening_rush' | 'night';

/**
 * ETA prediction input
 */
export interface ETAPredictionInput {
  segments: RouteSegment[];
  currentTime: Date;
  vehicleType: string;
  driverId?: string;
  trafficCondition?: TrafficCondition;
  weatherCondition?: WeatherCondition;
}

/**
 * ETA prediction result
 */
export interface ETAPredictionResult {
  estimatedArrival: Date;
  estimatedDuration: number; // seconds
  confidence: number; // 0-100
  factors: {
    baseTime: number;
    trafficImpact: number;
    weatherImpact: number;
    driverPerformance: number;
    timeOfDayImpact: number;
  };
  variance: {
    min: Date;
    max: Date;
  };
}

/**
 * Historical route performance data
 */
interface HistoricalRouteData {
  segmentKey: string;
  avgDuration: number;
  stdDeviation: number;
  sampleCount: number;
  trafficMultipliers: Record<TrafficCondition, number>;
  weatherMultipliers: Record<WeatherCondition, number>;
  timeOfDayMultipliers: Record<TimeOfDay, number>;
}

/**
 * Driver performance metrics
 */
interface DriverPerformance {
  driverId: string;
  avgSpeedRatio: number; // actual speed / expected speed
  consistencyScore: number; // 0-100
  delayFrequency: number; // 0-1
}

/**
 * ETA Prediction Model
 *
 * Uses historical data and machine learning to predict accurate ETAs
 */
export class ETAPredictionModel {
  private historicalDataCache: Map<string, HistoricalRouteData> = new Map();
  private driverPerformanceCache: Map<string, DriverPerformance> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour in ms
  private lastCacheUpdate: number = 0;

  /**
   * Predict ETA for a route
   */
  async predict(input: ETAPredictionInput): Promise<ETAPredictionResult> {
    // Refresh cache if expired
    await this.refreshCacheIfNeeded();

    // Calculate base time from segments
    const baseTime = this.calculateBaseTime(input.segments);

    // Get time of day
    const timeOfDay = this.getTimeOfDay(input.currentTime);

    // Apply modifiers
    const trafficImpact = this.calculateTrafficImpact(
      input.segments,
      input.trafficCondition || 'moderate',
      timeOfDay
    );

    const weatherImpact = this.calculateWeatherImpact(
      input.segments,
      input.weatherCondition || 'clear'
    );

    const driverPerformance = await this.calculateDriverPerformance(
      input.driverId,
      input.segments
    );

    const timeOfDayImpact = this.calculateTimeOfDayImpact(
      input.segments,
      timeOfDay
    );

    // Total estimated duration
    const totalImpact = trafficImpact + weatherImpact + driverPerformance + timeOfDayImpact;
    const estimatedDuration = baseTime + totalImpact;

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(input.segments, input.driverId);

    // Calculate variance (min/max range)
    const variance = this.calculateVariance(estimatedDuration, confidence);

    const estimatedArrival = new Date(input.currentTime.getTime() + estimatedDuration * 1000);

    return {
      estimatedArrival,
      estimatedDuration,
      confidence,
      factors: {
        baseTime,
        trafficImpact,
        weatherImpact,
        driverPerformance,
        timeOfDayImpact,
      },
      variance: {
        min: new Date(estimatedArrival.getTime() - variance * 1000),
        max: new Date(estimatedArrival.getTime() + variance * 1000),
      },
    };
  }

  /**
   * Calculate base time from route segments
   */
  private calculateBaseTime(segments: RouteSegment[]): number {
    return segments.reduce((total, segment) => {
      const segmentKey = this.getSegmentKey(segment.fromFacilityId, segment.toFacilityId);
      const historical = this.historicalDataCache.get(segmentKey);

      // Use historical average if available, otherwise use expected duration
      const duration = historical?.avgDuration || segment.expectedDuration;
      return total + duration;
    }, 0);
  }

  /**
   * Calculate traffic impact
   */
  private calculateTrafficImpact(
    segments: RouteSegment[],
    condition: TrafficCondition,
    timeOfDay: TimeOfDay
  ): number {
    const trafficMultipliers: Record<TrafficCondition, number> = {
      light: 0.9,
      moderate: 1.0,
      heavy: 1.3,
      severe: 1.7,
    };

    // Rush hour amplification
    const rushHourMultiplier = (timeOfDay === 'morning_rush' || timeOfDay === 'evening_rush') ? 1.2 : 1.0;

    const baseTime = this.calculateBaseTime(segments);
    const multiplier = trafficMultipliers[condition] * rushHourMultiplier;

    return baseTime * (multiplier - 1.0);
  }

  /**
   * Calculate weather impact
   */
  private calculateWeatherImpact(
    segments: RouteSegment[],
    condition: WeatherCondition
  ): number {
    const weatherMultipliers: Record<WeatherCondition, number> = {
      clear: 1.0,
      rain: 1.15,
      heavy_rain: 1.3,
      storm: 1.5,
    };

    const baseTime = this.calculateBaseTime(segments);
    const multiplier = weatherMultipliers[condition];

    return baseTime * (multiplier - 1.0);
  }

  /**
   * Calculate driver performance impact
   */
  private async calculateDriverPerformance(
    driverId: string | undefined,
    segments: RouteSegment[]
  ): Promise<number> {
    if (!driverId) return 0;

    const performance = this.driverPerformanceCache.get(driverId);
    if (!performance) return 0;

    const baseTime = this.calculateBaseTime(segments);

    // avgSpeedRatio < 1.0 means driver is slower than average
    // avgSpeedRatio > 1.0 means driver is faster than average
    return baseTime * (1.0 / performance.avgSpeedRatio - 1.0);
  }

  /**
   * Calculate time of day impact
   */
  private calculateTimeOfDayImpact(
    segments: RouteSegment[],
    timeOfDay: TimeOfDay
  ): number {
    const timeMultipliers: Record<TimeOfDay, number> = {
      early_morning: 0.95, // Less traffic
      morning_rush: 1.25,
      midday: 1.05,
      evening_rush: 1.3,
      night: 0.9, // Less traffic but slower driving
    };

    const baseTime = this.calculateBaseTime(segments);
    const multiplier = timeMultipliers[timeOfDay];

    return baseTime * (multiplier - 1.0);
  }

  /**
   * Calculate confidence score based on data availability
   */
  private calculateConfidence(segments: RouteSegment[], driverId?: string): number {
    let totalSamples = 0;
    let segmentsWithData = 0;

    segments.forEach((segment) => {
      const segmentKey = this.getSegmentKey(segment.fromFacilityId, segment.toFacilityId);
      const historical = this.historicalDataCache.get(segmentKey);

      if (historical) {
        segmentsWithData++;
        totalSamples += historical.sampleCount;
      }
    });

    // Base confidence on data coverage
    const dataCoverage = segments.length > 0 ? segmentsWithData / segments.length : 0;
    const avgSamples = segmentsWithData > 0 ? totalSamples / segmentsWithData : 0;

    // More samples = higher confidence (capped at 50%)
    const sampleConfidence = Math.min(avgSamples / 100, 0.5);

    // Data coverage contributes 50% of confidence
    const confidence = (dataCoverage * 50) + (sampleConfidence * 100);

    // Boost confidence if we have driver data
    const driverBoost = driverId && this.driverPerformanceCache.has(driverId) ? 10 : 0;

    return Math.min(Math.round(confidence + driverBoost), 100);
  }

  /**
   * Calculate variance (uncertainty range)
   */
  private calculateVariance(estimatedDuration: number, confidence: number): number {
    // Lower confidence = higher variance
    // confidence 100 = ±5% variance
    // confidence 50 = ±15% variance
    // confidence 0 = ±30% variance
    const variancePercent = 0.3 - (confidence / 100) * 0.25;
    return estimatedDuration * variancePercent;
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(time: Date): TimeOfDay {
    const hour = time.getHours();

    if (hour >= 5 && hour < 7) return 'early_morning';
    if (hour >= 7 && hour < 10) return 'morning_rush';
    if (hour >= 10 && hour < 16) return 'midday';
    if (hour >= 16 && hour < 19) return 'evening_rush';
    return 'night';
  }

  /**
   * Get segment cache key
   */
  private getSegmentKey(fromId: string, toId: string): string {
    return `${fromId}_${toId}`;
  }

  /**
   * Refresh historical data cache if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheExpiry) {
      return;
    }

    await Promise.all([
      this.loadHistoricalRouteData(),
      this.loadDriverPerformanceData(),
    ]);

    this.lastCacheUpdate = now;
  }

  /**
   * Load historical route data from database
   */
  private async loadHistoricalRouteData(): Promise<void> {
    try {
      // Query historical route performance
      const { data, error } = await supabase.rpc('get_route_segment_performance', {
        p_days_back: 90, // Last 90 days
      });

      if (error) {
        console.error('[ETAPredictionModel] Error loading historical data:', error);
        return;
      }

      // Populate cache
      data?.forEach((row: any) => {
        const segmentKey = this.getSegmentKey(row.from_facility_id, row.to_facility_id);
        this.historicalDataCache.set(segmentKey, {
          segmentKey,
          avgDuration: row.avg_duration,
          stdDeviation: row.std_deviation,
          sampleCount: row.sample_count,
          trafficMultipliers: row.traffic_multipliers || {},
          weatherMultipliers: row.weather_multipliers || {},
          timeOfDayMultipliers: row.time_of_day_multipliers || {},
        });
      });

      console.log(`[ETAPredictionModel] Loaded ${this.historicalDataCache.size} route segments`);
    } catch (err) {
      console.error('[ETAPredictionModel] Error loading historical data:', err);
    }
  }

  /**
   * Load driver performance data from database
   */
  private async loadDriverPerformanceData(): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('get_driver_performance_metrics', {
        p_days_back: 30, // Last 30 days
      });

      if (error) {
        console.error('[ETAPredictionModel] Error loading driver performance:', error);
        return;
      }

      // Populate cache
      data?.forEach((row: any) => {
        this.driverPerformanceCache.set(row.driver_id, {
          driverId: row.driver_id,
          avgSpeedRatio: row.avg_speed_ratio,
          consistencyScore: row.consistency_score,
          delayFrequency: row.delay_frequency,
        });
      });

      console.log(`[ETAPredictionModel] Loaded ${this.driverPerformanceCache.size} driver profiles`);
    } catch (err) {
      console.error('[ETAPredictionModel] Error loading driver performance:', err);
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.historicalDataCache.clear();
    this.driverPerformanceCache.clear();
    this.lastCacheUpdate = 0;
  }
}

/**
 * Singleton instance
 */
export const etaPredictionModel = new ETAPredictionModel();
