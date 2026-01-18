/**
 * Pattern Recognition Engine
 *
 * Identifies recurring patterns in delivery operations
 * Phase 7: Intelligence & Knowledge Graph
 *
 * Features:
 * - Recurring bottleneck identification
 * - Route optimization patterns
 * - Driver performance patterns
 * - Temporal patterns (daily, weekly, seasonal)
 * - Anomaly pattern detection
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Pattern types
 */
export type PatternType =
  | 'recurring_bottleneck'
  | 'optimal_route'
  | 'driver_behavior'
  | 'demand_surge'
  | 'delay_cluster'
  | 'efficiency_gain';

/**
 * Pattern frequency
 */
export type PatternFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * Recognized pattern
 */
export interface RecognizedPattern {
  id: string;
  type: PatternType;
  frequency: PatternFrequency;
  confidence: number; // 0-100
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  description: string;
  impact: {
    type: 'positive' | 'negative' | 'neutral';
    metric: string; // e.g., "delivery_time", "cost", "vehicle_utilization"
    value: number; // percentage change
  };
  location?: {
    type: 'zone' | 'facility' | 'route_segment';
    id: string;
    name: string;
    coordinates?: [number, number]; // [lat, lng]
  };
  affectedEntities: {
    type: 'vehicle' | 'driver' | 'batch' | 'zone';
    id: string;
    name: string;
  }[];
  recommendation?: string;
  metadata: Record<string, any>;
}

/**
 * Pattern search criteria
 */
export interface PatternSearchCriteria {
  types?: PatternType[];
  minConfidence?: number;
  minOccurrences?: number;
  startDate?: Date;
  endDate?: Date;
  location?: {
    type: 'zone' | 'facility';
    id: string;
  };
}

/**
 * Bottleneck pattern details
 */
interface BottleneckPattern {
  locationId: string;
  locationType: 'zone' | 'facility' | 'route_segment';
  hourOfDay: number;
  dayOfWeek: number;
  avgDelay: number; // minutes
  occurrences: number;
  affectedVehicles: Set<string>;
}

/**
 * Route efficiency pattern
 */
interface RouteEfficiencyPattern {
  segmentKey: string;
  fromFacilityId: string;
  toFacilityId: string;
  optimalDuration: number; // seconds
  avgDuration: number; // seconds
  bestDriverId?: string;
  occurrences: number;
}

/**
 * Pattern Recognition Engine
 *
 * Analyzes historical data to identify recurring patterns
 */
export class PatternRecognitionEngine {
  private patternCache: Map<string, RecognizedPattern> = new Map();
  private cacheExpiry: number = 14400000; // 4 hours in ms
  private lastCacheUpdate: number = 0;

  /**
   * Find patterns matching criteria
   */
  async findPatterns(criteria: PatternSearchCriteria = {}): Promise<RecognizedPattern[]> {
    await this.refreshCacheIfNeeded();

    let patterns = Array.from(this.patternCache.values());

    // Apply filters
    if (criteria.types && criteria.types.length > 0) {
      patterns = patterns.filter((p) => criteria.types!.includes(p.type));
    }

    if (criteria.minConfidence !== undefined) {
      patterns = patterns.filter((p) => p.confidence >= criteria.minConfidence!);
    }

    if (criteria.minOccurrences !== undefined) {
      patterns = patterns.filter((p) => p.occurrences >= criteria.minOccurrences!);
    }

    if (criteria.startDate) {
      patterns = patterns.filter((p) => p.lastSeen >= criteria.startDate!);
    }

    if (criteria.endDate) {
      patterns = patterns.filter((p) => p.firstSeen <= criteria.endDate!);
    }

    if (criteria.location) {
      patterns = patterns.filter(
        (p) =>
          p.location?.type === criteria.location!.type &&
          p.location?.id === criteria.location!.id
      );
    }

    // Sort by confidence and occurrences
    return patterns.sort((a, b) => {
      const confDiff = b.confidence - a.confidence;
      if (confDiff !== 0) return confDiff;
      return b.occurrences - a.occurrences;
    });
  }

  /**
   * Analyze data and recognize patterns
   */
  async analyzePatterns(): Promise<void> {
    console.log('[PatternRecognitionEngine] Starting pattern analysis...');

    const patterns: RecognizedPattern[] = [];

    // Run analysis algorithms in parallel
    const [bottlenecks, routes, drivers, demand] = await Promise.all([
      this.analyzeBottleneckPatterns(),
      this.analyzeRouteOptimizationPatterns(),
      this.analyzeDriverBehaviorPatterns(),
      this.analyzeDemandSurgePatterns(),
    ]);

    patterns.push(...bottlenecks, ...routes, ...drivers, ...demand);

    // Update cache
    this.patternCache.clear();
    patterns.forEach((pattern) => {
      this.patternCache.set(pattern.id, pattern);
    });

    this.lastCacheUpdate = Date.now();

    console.log(`[PatternRecognitionEngine] Recognized ${patterns.length} patterns`);
  }

  /**
   * Analyze recurring bottleneck patterns
   */
  private async analyzeBottleneckPatterns(): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];

    try {
      // Query delays grouped by location and time
      const { data, error } = await supabase.rpc('analyze_recurring_delays', {
        p_days_back: 90,
        p_min_occurrences: 5,
      });

      if (error) throw error;

      // Group by location
      const bottleneckMap = new Map<string, BottleneckPattern>();

      data?.forEach((row: any) => {
        const key = `${row.location_id}_${row.hour_of_day}_${row.day_of_week}`;
        const existing = bottleneckMap.get(key);

        if (existing) {
          existing.occurrences += row.occurrence_count;
          existing.avgDelay = (existing.avgDelay + row.avg_delay_minutes) / 2;
          existing.affectedVehicles.add(row.vehicle_id);
        } else {
          bottleneckMap.set(key, {
            locationId: row.location_id,
            locationType: row.location_type,
            hourOfDay: row.hour_of_day,
            dayOfWeek: row.day_of_week,
            avgDelay: row.avg_delay_minutes,
            occurrences: row.occurrence_count,
            affectedVehicles: new Set([row.vehicle_id]),
          });
        }
      });

      // Convert to recognized patterns
      bottleneckMap.forEach((bottleneck, key) => {
        if (bottleneck.occurrences >= 5) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayNames[bottleneck.dayOfWeek];
          const hour = bottleneck.hourOfDay.toString().padStart(2, '0') + ':00';

          patterns.push({
            id: `bottleneck_${key}`,
            type: 'recurring_bottleneck',
            frequency: 'weekly',
            confidence: this.calculateBottleneckConfidence(bottleneck),
            occurrences: bottleneck.occurrences,
            firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Estimate
            lastSeen: new Date(),
            description: `Recurring ${bottleneck.avgDelay.toFixed(0)}min delay every ${dayName} at ${hour}`,
            impact: {
              type: 'negative',
              metric: 'delivery_time',
              value: bottleneck.avgDelay,
            },
            location: {
              type: bottleneck.locationType,
              id: bottleneck.locationId,
              name: `Location ${bottleneck.locationId}`,
            },
            affectedEntities: Array.from(bottleneck.affectedVehicles).map((id) => ({
              type: 'vehicle' as const,
              id,
              name: `Vehicle ${id}`,
            })),
            recommendation: `Consider adjusting schedule to avoid ${dayName} ${hour} deliveries at this location`,
            metadata: {
              hourOfDay: bottleneck.hourOfDay,
              dayOfWeek: bottleneck.dayOfWeek,
              avgDelay: bottleneck.avgDelay,
            },
          });
        }
      });
    } catch (err) {
      console.error('[PatternRecognitionEngine] Error analyzing bottlenecks:', err);
    }

    return patterns;
  }

  /**
   * Analyze route optimization patterns
   */
  private async analyzeRouteOptimizationPatterns(): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];

    try {
      const { data, error } = await supabase.rpc('analyze_route_efficiency', {
        p_days_back: 90,
      });

      if (error) throw error;

      data?.forEach((row: any) => {
        const improvement = ((row.avg_duration - row.optimal_duration) / row.avg_duration) * 100;

        if (improvement > 10 && row.occurrence_count >= 10) {
          patterns.push({
            id: `route_opt_${row.segment_key}`,
            type: 'optimal_route',
            frequency: 'daily',
            confidence: Math.min(95, 60 + row.occurrence_count / 2),
            occurrences: row.occurrence_count,
            firstSeen: new Date(row.first_seen),
            lastSeen: new Date(row.last_seen),
            description: `Optimal route found: ${improvement.toFixed(0)}% faster than average`,
            impact: {
              type: 'positive',
              metric: 'delivery_time',
              value: -improvement,
            },
            affectedEntities: [
              {
                type: 'driver' as const,
                id: row.best_driver_id,
                name: `Driver ${row.best_driver_id}`,
              },
            ],
            recommendation: `Share best practices from Driver ${row.best_driver_id} for this route segment`,
            metadata: {
              segmentKey: row.segment_key,
              optimalDuration: row.optimal_duration,
              avgDuration: row.avg_duration,
              improvement,
            },
          });
        }
      });
    } catch (err) {
      console.error('[PatternRecognitionEngine] Error analyzing routes:', err);
    }

    return patterns;
  }

  /**
   * Analyze driver behavior patterns
   */
  private async analyzeDriverBehaviorPatterns(): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];

    try {
      const { data, error } = await supabase.rpc('analyze_driver_consistency', {
        p_days_back: 90,
      });

      if (error) throw error;

      data?.forEach((row: any) => {
        // Identify consistently high-performing drivers
        if (row.consistency_score > 80 && row.avg_performance_ratio > 1.1) {
          patterns.push({
            id: `driver_behavior_${row.driver_id}`,
            type: 'driver_behavior',
            frequency: 'daily',
            confidence: row.consistency_score,
            occurrences: row.total_deliveries,
            firstSeen: new Date(row.first_delivery),
            lastSeen: new Date(row.last_delivery),
            description: `Consistently ${((row.avg_performance_ratio - 1) * 100).toFixed(0)}% above average performance`,
            impact: {
              type: 'positive',
              metric: 'delivery_efficiency',
              value: (row.avg_performance_ratio - 1) * 100,
            },
            affectedEntities: [
              {
                type: 'driver' as const,
                id: row.driver_id,
                name: row.driver_name,
              },
            ],
            recommendation: `Consider training other drivers using techniques from ${row.driver_name}`,
            metadata: {
              consistencyScore: row.consistency_score,
              performanceRatio: row.avg_performance_ratio,
              totalDeliveries: row.total_deliveries,
            },
          });
        }
      });
    } catch (err) {
      console.error('[PatternRecognitionEngine] Error analyzing drivers:', err);
    }

    return patterns;
  }

  /**
   * Analyze demand surge patterns
   */
  private async analyzeDemandSurgePatterns(): Promise<RecognizedPattern[]> {
    const patterns: RecognizedPattern[] = [];

    try {
      const { data, error } = await supabase.rpc('analyze_demand_surges', {
        p_days_back: 90,
      });

      if (error) throw error;

      data?.forEach((row: any) => {
        patterns.push({
          id: `demand_surge_${row.zone_id}_${row.pattern_key}`,
          type: 'demand_surge',
          frequency: row.frequency as PatternFrequency,
          confidence: row.confidence,
          occurrences: row.surge_count,
          firstSeen: new Date(row.first_surge),
          lastSeen: new Date(row.last_surge),
          description: `${row.surge_percentage}% demand surge ${row.frequency}`,
          impact: {
            type: 'neutral',
            metric: 'demand_volume',
            value: row.surge_percentage,
          },
          location: {
            type: 'zone',
            id: row.zone_id,
            name: row.zone_name,
          },
          affectedEntities: [],
          recommendation: `Pre-allocate ${Math.ceil(row.surge_percentage / 25)} additional vehicle(s) during surge periods`,
          metadata: {
            surgePercentage: row.surge_percentage,
            avgSurgeDuration: row.avg_surge_duration_hours,
          },
        });
      });
    } catch (err) {
      console.error('[PatternRecognitionEngine] Error analyzing demand:', err);
    }

    return patterns;
  }

  /**
   * Calculate bottleneck confidence
   */
  private calculateBottleneckConfidence(bottleneck: BottleneckPattern): number {
    // More occurrences = higher confidence
    const occurrenceConfidence = Math.min(bottleneck.occurrences / 20, 1.0) * 50;

    // More affected vehicles = higher confidence
    const vehicleConfidence = Math.min(bottleneck.affectedVehicles.size / 5, 1.0) * 30;

    // Larger delays = higher confidence
    const delayConfidence = Math.min(bottleneck.avgDelay / 30, 1.0) * 20;

    return Math.round(occurrenceConfidence + vehicleConfidence + delayConfidence);
  }

  /**
   * Refresh cache if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheExpiry) {
      return;
    }

    await this.analyzePatterns();
  }

  /**
   * Force refresh patterns
   */
  async refresh(): Promise<void> {
    await this.analyzePatterns();
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.patternCache.clear();
    this.lastCacheUpdate = 0;
  }
}

/**
 * Singleton instance
 */
export const patternRecognitionEngine = new PatternRecognitionEngine();
