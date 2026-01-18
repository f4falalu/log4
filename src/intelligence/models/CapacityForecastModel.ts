/**
 * Capacity Forecast Model
 *
 * Predictive capacity forecasting for vehicles and service zones
 * Phase 7: Intelligence & Knowledge Graph
 *
 * Features:
 * - Vehicle capacity prediction
 * - Zone demand forecasting
 * - Bottleneck prediction
 * - Resource optimization recommendations
 * - Seasonal pattern recognition
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Time horizon for forecast
 */
export type ForecastHorizon = '1hour' | '4hours' | '1day' | '1week';

/**
 * Forecast input parameters
 */
export interface CapacityForecastInput {
  zoneId?: string; // Specific zone or all zones
  vehicleId?: string; // Specific vehicle or all vehicles
  startTime: Date;
  horizon: ForecastHorizon;
}

/**
 * Capacity forecast result
 */
export interface CapacityForecastResult {
  forecastTime: Date;
  predictions: CapacityPrediction[];
  bottlenecks: BottleneckPrediction[];
  recommendations: CapacityRecommendation[];
  confidence: number; // 0-100
}

/**
 * Individual capacity prediction
 */
export interface CapacityPrediction {
  entityId: string;
  entityType: 'vehicle' | 'zone';
  entityName: string;
  currentCapacity: number; // Current utilization %
  predictedCapacity: number; // Predicted utilization %
  timepoint: Date;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Bottleneck prediction
 */
export interface BottleneckPrediction {
  location: {
    type: 'zone' | 'facility' | 'route_segment';
    id: string;
    name: string;
    coordinates?: [number, number]; // [lat, lng]
  };
  predictedTime: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedDelay: number; // minutes
  affectedVehicles: number;
  confidence: number;
  contributing_factors: string[];
}

/**
 * Capacity recommendation
 */
export interface CapacityRecommendation {
  type: 'add_vehicle' | 'redistribute_load' | 'adjust_schedule' | 'expand_zone' | 'add_driver';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  impact: {
    capacityImprovement: number; // percentage points
    costEstimate: number; // relative cost 1-10
    implementationTime: string; // e.g., "immediate", "1 day", "1 week"
  };
  affectedEntities: string[];
}

/**
 * Historical demand pattern
 */
interface DemandPattern {
  hourOfDay: number;
  dayOfWeek: number;
  avgDemand: number;
  peakDemand: number;
  stdDeviation: number;
  sampleCount: number;
}

/**
 * Seasonal factor
 */
interface SeasonalFactor {
  month: number;
  multiplier: number;
  confidence: number;
}

/**
 * Capacity Forecast Model
 *
 * Uses time-series analysis and historical patterns to forecast capacity needs
 */
export class CapacityForecastModel {
  private demandPatternCache: Map<string, DemandPattern[]> = new Map();
  private seasonalFactorCache: Map<number, SeasonalFactor> = new Map();
  private cacheExpiry: number = 7200000; // 2 hours in ms
  private lastCacheUpdate: number = 0;

  /**
   * Generate capacity forecast
   */
  async forecast(input: CapacityForecastInput): Promise<CapacityForecastResult> {
    await this.refreshCacheIfNeeded();

    const horizonMs = this.getHorizonMilliseconds(input.horizon);
    const timepoints = this.generateTimepoints(input.startTime, horizonMs);

    // Generate predictions for each timepoint
    const predictions: CapacityPrediction[] = [];
    for (const timepoint of timepoints) {
      const zonePredictions = await this.predictZoneCapacity(input.zoneId, timepoint);
      const vehiclePredictions = await this.predictVehicleCapacity(input.vehicleId, timepoint);
      predictions.push(...zonePredictions, ...vehiclePredictions);
    }

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(predictions);

    // Generate recommendations
    const recommendations = this.generateRecommendations(predictions, bottlenecks);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(predictions);

    return {
      forecastTime: input.startTime,
      predictions,
      bottlenecks,
      recommendations,
      confidence,
    };
  }

  /**
   * Predict zone capacity at specific time
   */
  private async predictZoneCapacity(
    zoneId: string | undefined,
    timepoint: Date
  ): Promise<CapacityPrediction[]> {
    const predictions: CapacityPrediction[] = [];

    try {
      // Get current zone utilization
      const { data: zones, error } = await supabase
        .from('service_zones')
        .select('id, name, current_utilization')
        .eq(zoneId ? 'id' : 'active', zoneId || true);

      if (error) throw error;

      zones?.forEach((zone) => {
        const pattern = this.getDemandPattern(zone.id, timepoint);
        if (!pattern) return;

        const seasonalFactor = this.getSeasonalFactor(timepoint);
        const predictedDemand = pattern.avgDemand * seasonalFactor;

        // Convert demand to capacity utilization (0-100%)
        const predictedCapacity = Math.min(predictedDemand * 100, 100);
        const currentCapacity = zone.current_utilization || 0;

        // Determine trend
        const trend = this.determineTrend(currentCapacity, predictedCapacity);

        // Confidence based on sample count and standard deviation
        const confidence = this.calculatePredictionConfidence(pattern);

        predictions.push({
          entityId: zone.id,
          entityType: 'zone',
          entityName: zone.name,
          currentCapacity,
          predictedCapacity,
          timepoint,
          confidence,
          trend,
        });
      });
    } catch (err) {
      console.error('[CapacityForecastModel] Error predicting zone capacity:', err);
    }

    return predictions;
  }

  /**
   * Predict vehicle capacity at specific time
   */
  private async predictVehicleCapacity(
    vehicleId: string | undefined,
    timepoint: Date
  ): Promise<CapacityPrediction[]> {
    const predictions: CapacityPrediction[] = [];

    try {
      // Get current vehicle utilization
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, current_payload_percentage')
        .eq(vehicleId ? 'id' : 'status', vehicleId || 'active');

      if (error) throw error;

      vehicles?.forEach((vehicle) => {
        // Use route history to predict future capacity
        const pattern = this.getDemandPattern(vehicle.id, timepoint);
        if (!pattern) return;

        const predictedCapacity = Math.min(pattern.avgDemand * 100, 100);
        const currentCapacity = vehicle.current_payload_percentage || 0;

        const trend = this.determineTrend(currentCapacity, predictedCapacity);
        const confidence = this.calculatePredictionConfidence(pattern);

        predictions.push({
          entityId: vehicle.id,
          entityType: 'vehicle',
          entityName: vehicle.registration_number,
          currentCapacity,
          predictedCapacity,
          timepoint,
          confidence,
          trend,
        });
      });
    } catch (err) {
      console.error('[CapacityForecastModel] Error predicting vehicle capacity:', err);
    }

    return predictions;
  }

  /**
   * Identify bottlenecks from predictions
   */
  private identifyBottlenecks(predictions: CapacityPrediction[]): BottleneckPrediction[] {
    const bottlenecks: BottleneckPrediction[] = [];

    // Group predictions by entity
    const entityGroups = new Map<string, CapacityPrediction[]>();
    predictions.forEach((pred) => {
      const existing = entityGroups.get(pred.entityId) || [];
      existing.push(pred);
      entityGroups.set(pred.entityId, existing);
    });

    // Identify entities predicted to exceed capacity
    entityGroups.forEach((preds, entityId) => {
      const overCapacity = preds.filter((p) => p.predictedCapacity > 90);

      if (overCapacity.length > 0) {
        const firstOverCapacity = overCapacity[0];
        const severity = this.calculateBottleneckSeverity(firstOverCapacity.predictedCapacity);
        const expectedDelay = this.estimateDelay(firstOverCapacity.predictedCapacity);

        bottlenecks.push({
          location: {
            type: firstOverCapacity.entityType === 'zone' ? 'zone' : 'route_segment',
            id: entityId,
            name: firstOverCapacity.entityName,
          },
          predictedTime: firstOverCapacity.timepoint,
          severity,
          expectedDelay,
          affectedVehicles: firstOverCapacity.entityType === 'zone' ? 5 : 1, // Estimate
          confidence: firstOverCapacity.confidence,
          contributing_factors: this.identifyContributingFactors(firstOverCapacity),
        });
      }
    });

    // Sort by severity and predicted time
    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.predictedTime.getTime() - b.predictedTime.getTime();
    });
  }

  /**
   * Generate recommendations based on predictions and bottlenecks
   */
  private generateRecommendations(
    predictions: CapacityPrediction[],
    bottlenecks: BottleneckPrediction[]
  ): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];

    // Recommendations for bottlenecks
    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        // Immediate action needed
        recommendations.push({
          type: 'add_vehicle',
          priority: 'urgent',
          description: `Add additional vehicle to ${bottleneck.location.name} to prevent critical bottleneck at ${bottleneck.predictedTime.toLocaleTimeString()}`,
          impact: {
            capacityImprovement: 25,
            costEstimate: 8,
            implementationTime: 'immediate',
          },
          affectedEntities: [bottleneck.location.id],
        });
      }

      if (bottleneck.severity === 'medium') {
        // Redistribute load
        recommendations.push({
          type: 'redistribute_load',
          priority: 'medium',
          description: `Redistribute deliveries from ${bottleneck.location.name} to adjacent zones to prevent bottleneck`,
          impact: {
            capacityImprovement: 15,
            costEstimate: 3,
            implementationTime: '1 hour',
          },
          affectedEntities: [bottleneck.location.id],
        });
      }
    });

    // Recommendations for trending patterns
    const increasingCapacity = predictions.filter(
      (p) => p.trend === 'increasing' && p.predictedCapacity > 75
    );

    if (increasingCapacity.length > 3) {
      recommendations.push({
        type: 'adjust_schedule',
        priority: 'medium',
        description: `Adjust delivery schedule to distribute load more evenly across peak hours`,
        impact: {
          capacityImprovement: 10,
          costEstimate: 2,
          implementationTime: '1 day',
        },
        affectedEntities: increasingCapacity.map((p) => p.entityId),
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate overall forecast confidence
   */
  private calculateOverallConfidence(predictions: CapacityPrediction[]): number {
    if (predictions.length === 0) return 0;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    return Math.round(avgConfidence);
  }

  /**
   * Get demand pattern for entity at specific time
   */
  private getDemandPattern(entityId: string, time: Date): DemandPattern | null {
    const patterns = this.demandPatternCache.get(entityId);
    if (!patterns) return null;

    const hourOfDay = time.getHours();
    const dayOfWeek = time.getDay();

    // Find matching pattern
    return (
      patterns.find((p) => p.hourOfDay === hourOfDay && p.dayOfWeek === dayOfWeek) ||
      patterns[0] || // Fallback to first pattern
      null
    );
  }

  /**
   * Get seasonal factor for given time
   */
  private getSeasonalFactor(time: Date): number {
    const month = time.getMonth();
    const factor = this.seasonalFactorCache.get(month);
    return factor?.multiplier || 1.0;
  }

  /**
   * Determine trend direction
   */
  private determineTrend(current: number, predicted: number): 'increasing' | 'decreasing' | 'stable' {
    const diff = predicted - current;
    if (Math.abs(diff) < 5) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate prediction confidence based on pattern quality
   */
  private calculatePredictionConfidence(pattern: DemandPattern): number {
    // More samples = higher confidence
    const sampleConfidence = Math.min(pattern.sampleCount / 50, 1.0) * 50;

    // Lower std deviation = higher confidence
    const varianceConfidence = Math.max(0, 50 - pattern.stdDeviation * 10);

    return Math.round(sampleConfidence + varianceConfidence);
  }

  /**
   * Calculate bottleneck severity
   */
  private calculateBottleneckSeverity(capacity: number): 'low' | 'medium' | 'high' | 'critical' {
    if (capacity >= 100) return 'critical';
    if (capacity >= 95) return 'high';
    if (capacity >= 90) return 'medium';
    return 'low';
  }

  /**
   * Estimate delay in minutes based on capacity
   */
  private estimateDelay(capacity: number): number {
    if (capacity >= 100) return 60; // 1 hour delay
    if (capacity >= 95) return 30;
    if (capacity >= 90) return 15;
    return 5;
  }

  /**
   * Identify contributing factors for bottleneck
   */
  private identifyContributingFactors(prediction: CapacityPrediction): string[] {
    const factors: string[] = [];

    if (prediction.trend === 'increasing') {
      factors.push('Increasing demand trend');
    }

    const hour = prediction.timepoint.getHours();
    if ((hour >= 7 && hour < 10) || (hour >= 16 && hour < 19)) {
      factors.push('Peak hour traffic');
    }

    if (prediction.predictedCapacity > 90) {
      factors.push('High capacity utilization');
    }

    return factors;
  }

  /**
   * Get horizon in milliseconds
   */
  private getHorizonMilliseconds(horizon: ForecastHorizon): number {
    const horizonMap: Record<ForecastHorizon, number> = {
      '1hour': 3600000,
      '4hours': 14400000,
      '1day': 86400000,
      '1week': 604800000,
    };
    return horizonMap[horizon];
  }

  /**
   * Generate timepoints for forecast
   */
  private generateTimepoints(start: Date, horizonMs: number): Date[] {
    const timepoints: Date[] = [];
    const interval = horizonMs < 14400000 ? 3600000 : 14400000; // 1 hour or 4 hours

    for (let offset = 0; offset <= horizonMs; offset += interval) {
      timepoints.push(new Date(start.getTime() + offset));
    }

    return timepoints;
  }

  /**
   * Refresh cache if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheExpiry) {
      return;
    }

    await Promise.all([this.loadDemandPatterns(), this.loadSeasonalFactors()]);

    this.lastCacheUpdate = now;
  }

  /**
   * Load demand patterns from database
   */
  private async loadDemandPatterns(): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('get_demand_patterns', {
        p_days_back: 90,
      });

      if (error) {
        console.error('[CapacityForecastModel] Error loading demand patterns:', error);
        return;
      }

      // Group by entity ID
      const grouped = new Map<string, DemandPattern[]>();
      data?.forEach((row: any) => {
        const entityId = row.entity_id;
        const existing = grouped.get(entityId) || [];
        existing.push({
          hourOfDay: row.hour_of_day,
          dayOfWeek: row.day_of_week,
          avgDemand: row.avg_demand,
          peakDemand: row.peak_demand,
          stdDeviation: row.std_deviation,
          sampleCount: row.sample_count,
        });
        grouped.set(entityId, existing);
      });

      this.demandPatternCache = grouped;
      console.log(`[CapacityForecastModel] Loaded patterns for ${grouped.size} entities`);
    } catch (err) {
      console.error('[CapacityForecastModel] Error loading demand patterns:', err);
    }
  }

  /**
   * Load seasonal factors from database
   */
  private async loadSeasonalFactors(): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('get_seasonal_factors');

      if (error) {
        console.error('[CapacityForecastModel] Error loading seasonal factors:', error);
        return;
      }

      data?.forEach((row: any) => {
        this.seasonalFactorCache.set(row.month, {
          month: row.month,
          multiplier: row.multiplier,
          confidence: row.confidence,
        });
      });

      console.log(`[CapacityForecastModel] Loaded ${this.seasonalFactorCache.size} seasonal factors`);
    } catch (err) {
      console.error('[CapacityForecastModel] Error loading seasonal factors:', err);
    }
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.demandPatternCache.clear();
    this.seasonalFactorCache.clear();
    this.lastCacheUpdate = 0;
  }
}

/**
 * Singleton instance
 */
export const capacityForecastModel = new CapacityForecastModel();
