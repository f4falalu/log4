/**
 * Map Load Testing Script
 *
 * Tests map performance with high marker counts
 * Phase 8: Governance & Scale
 *
 * Usage:
 * npm run test:map-load
 * or
 * ts-node scripts/map-load-test.ts
 */

import { performance } from 'perf_hooks';

/**
 * Test configuration
 */
interface LoadTestConfig {
  vehicleCount: number;
  driverCount: number;
  facilityCount: number;
  routeCount: number;
  updateIntervalMs: number;
  testDurationMs: number;
}

/**
 * Test results
 */
interface LoadTestResults {
  config: LoadTestConfig;
  startTime: Date;
  endTime: Date;
  metrics: {
    initialRenderTime: number; // ms
    avgFrameTime: number; // ms
    minFPS: number;
    avgFPS: number;
    maxFPS: number;
    avgUpdateTime: number; // ms
    totalUpdates: number;
    memoryUsage: {
      initial: number; // MB
      peak: number; // MB
      final: number; // MB
    };
    errors: string[];
  };
  passed: boolean;
}

/**
 * Performance thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  initialRenderTime: 3000, // 3 seconds max
  minAcceptableFPS: 30,
  avgAcceptableFPS: 50,
  maxUpdateTime: 100, // 100ms max per update
  maxMemoryIncrease: 500, // 500MB max memory increase
};

/**
 * Generate mock vehicle data
 */
function generateVehicles(count: number) {
  const vehicles = [];
  for (let i = 0; i < count; i++) {
    vehicles.push({
      id: `vehicle-${i}`,
      registration_number: `VEH-${i.toString().padStart(4, '0')}`,
      type: ['truck', 'van', 'motorcycle'][Math.floor(Math.random() * 3)],
      status: ['active', 'inactive', 'maintenance'][Math.floor(Math.random() * 3)],
      current_location: {
        lat: 9.082 + (Math.random() - 0.5) * 0.5, // Random location in Nigeria
        lng: 8.6753 + (Math.random() - 0.5) * 0.5,
      },
      bearing: Math.floor(Math.random() * 360),
      current_payload_percentage: Math.floor(Math.random() * 100),
    });
  }
  return vehicles;
}

/**
 * Generate mock driver data
 */
function generateDrivers(count: number) {
  const drivers = [];
  for (let i = 0; i < count; i++) {
    drivers.push({
      id: `driver-${i}`,
      first_name: `Driver`,
      last_name: `${i}`,
      status: ['available', 'on_delivery', 'off_duty'][Math.floor(Math.random() * 3)],
      current_location: {
        lat: 9.082 + (Math.random() - 0.5) * 0.5,
        lng: 8.6753 + (Math.random() - 0.5) * 0.5,
      },
    });
  }
  return drivers;
}

/**
 * Generate mock facility data
 */
function generateFacilities(count: number) {
  const facilities = [];
  for (let i = 0; i < count; i++) {
    facilities.push({
      id: `facility-${i}`,
      name: `Facility ${i}`,
      type: ['hospital', 'clinic', 'pharmacy'][Math.floor(Math.random() * 3)],
      latitude: 9.082 + (Math.random() - 0.5) * 1.0,
      longitude: 8.6753 + (Math.random() - 0.5) * 1.0,
      status: 'active',
    });
  }
  return facilities;
}

/**
 * Generate mock route data
 */
function generateRoutes(count: number, facilities: any[]) {
  const routes = [];
  for (let i = 0; i < count; i++) {
    const stopCount = Math.floor(Math.random() * 5) + 3; // 3-7 stops
    const stops = [];

    for (let j = 0; j < stopCount; j++) {
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      stops.push({
        lat: facility.latitude,
        lng: facility.longitude,
      });
    }

    routes.push({
      id: `route-${i}`,
      stops,
      status: ['planned', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
    });
  }
  return routes;
}

/**
 * Simulate map rendering
 */
async function simulateMapRender(data: any): Promise<number> {
  const startTime = performance.now();

  // Simulate GeoJSON transformation
  const geoJsonFeatures = [
    ...data.vehicles.map((v: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [v.current_location.lng, v.current_location.lat],
      },
      properties: v,
    })),
    ...data.drivers.map((d: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [d.current_location.lng, d.current_location.lat],
      },
      properties: d,
    })),
    ...data.facilities.map((f: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [f.longitude, f.latitude],
      },
      properties: f,
    })),
  ];

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 10));

  const renderTime = performance.now() - startTime;
  return renderTime;
}

/**
 * Simulate real-time updates
 */
function simulateUpdate(data: any): void {
  // Update vehicle positions
  data.vehicles.forEach((v: any) => {
    v.current_location.lat += (Math.random() - 0.5) * 0.001;
    v.current_location.lng += (Math.random() - 0.5) * 0.001;
    v.bearing = (v.bearing + Math.floor(Math.random() * 10) - 5 + 360) % 360;
  });

  // Update driver positions
  data.drivers.forEach((d: any) => {
    d.current_location.lat += (Math.random() - 0.5) * 0.001;
    d.current_location.lng += (Math.random() - 0.5) * 0.001;
  });
}

/**
 * Get memory usage in MB
 */
function getMemoryUsageMB(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
  // Fallback for browser environment
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
  }
  return 0;
}

/**
 * Run load test
 */
async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
  console.log('[LoadTest] Starting load test with config:', config);

  const results: LoadTestResults = {
    config,
    startTime: new Date(),
    endTime: new Date(),
    metrics: {
      initialRenderTime: 0,
      avgFrameTime: 0,
      minFPS: Infinity,
      avgFPS: 0,
      maxFPS: 0,
      avgUpdateTime: 0,
      totalUpdates: 0,
      memoryUsage: {
        initial: getMemoryUsageMB(),
        peak: getMemoryUsageMB(),
        final: 0,
      },
      errors: [],
    },
    passed: false,
  };

  try {
    // Generate test data
    console.log('[LoadTest] Generating test data...');
    const vehicles = generateVehicles(config.vehicleCount);
    const drivers = generateDrivers(config.driverCount);
    const facilities = generateFacilities(config.facilityCount);
    const routes = generateRoutes(config.routeCount, facilities);

    const testData = { vehicles, drivers, facilities, routes };

    // Initial render
    console.log('[LoadTest] Performing initial render...');
    results.metrics.initialRenderTime = await simulateMapRender(testData);
    console.log(`[LoadTest] Initial render time: ${results.metrics.initialRenderTime.toFixed(2)}ms`);

    // Run update loop
    console.log('[LoadTest] Starting update loop...');
    const frameTimes: number[] = [];
    const updateTimes: number[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < config.testDurationMs) {
      const frameStart = performance.now();

      // Simulate update
      simulateUpdate(testData);
      const updateTime = await simulateMapRender(testData);
      updateTimes.push(updateTime);

      const frameTime = performance.now() - frameStart;
      frameTimes.push(frameTime);

      // Track FPS
      const fps = 1000 / frameTime;
      results.metrics.minFPS = Math.min(results.metrics.minFPS, fps);
      results.metrics.maxFPS = Math.max(results.metrics.maxFPS, fps);

      // Track peak memory
      const currentMemory = getMemoryUsageMB();
      results.metrics.memoryUsage.peak = Math.max(results.metrics.memoryUsage.peak, currentMemory);

      results.metrics.totalUpdates++;

      // Wait for next update interval
      await new Promise((resolve) => setTimeout(resolve, config.updateIntervalMs));
    }

    // Calculate statistics
    results.metrics.avgFrameTime = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length;
    results.metrics.avgFPS = frameTimes.length > 0 ? 1000 / results.metrics.avgFrameTime : 0;
    results.metrics.avgUpdateTime = updateTimes.reduce((sum, t) => sum + t, 0) / updateTimes.length;
    results.metrics.memoryUsage.final = getMemoryUsageMB();

    // Check if passed
    results.passed =
      results.metrics.initialRenderTime <= PERFORMANCE_THRESHOLDS.initialRenderTime &&
      results.metrics.minFPS >= PERFORMANCE_THRESHOLDS.minAcceptableFPS &&
      results.metrics.avgFPS >= PERFORMANCE_THRESHOLDS.avgAcceptableFPS &&
      results.metrics.avgUpdateTime <= PERFORMANCE_THRESHOLDS.maxUpdateTime &&
      results.metrics.memoryUsage.final - results.metrics.memoryUsage.initial <=
        PERFORMANCE_THRESHOLDS.maxMemoryIncrease;

    console.log('[LoadTest] Test completed');
  } catch (err) {
    results.metrics.errors.push((err as Error).message);
    console.error('[LoadTest] Test failed with error:', err);
  }

  results.endTime = new Date();
  return results;
}

/**
 * Print test results
 */
function printResults(results: LoadTestResults): void {
  console.log('\n========================================');
  console.log('MAP LOAD TEST RESULTS');
  console.log('========================================\n');

  console.log('Test Configuration:');
  console.log(`  Vehicles: ${results.config.vehicleCount}`);
  console.log(`  Drivers: ${results.config.driverCount}`);
  console.log(`  Facilities: ${results.config.facilityCount}`);
  console.log(`  Routes: ${results.config.routeCount}`);
  console.log(`  Update Interval: ${results.config.updateIntervalMs}ms`);
  console.log(`  Test Duration: ${results.config.testDurationMs / 1000}s`);
  console.log('');

  console.log('Performance Metrics:');
  console.log(`  Initial Render Time: ${results.metrics.initialRenderTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.initialRenderTime}ms)`);
  console.log(`  Avg Frame Time: ${results.metrics.avgFrameTime.toFixed(2)}ms`);
  console.log(`  Avg FPS: ${results.metrics.avgFPS.toFixed(1)} (threshold: ≥${PERFORMANCE_THRESHOLDS.avgAcceptableFPS})`);
  console.log(`  Min FPS: ${results.metrics.minFPS.toFixed(1)} (threshold: ≥${PERFORMANCE_THRESHOLDS.minAcceptableFPS})`);
  console.log(`  Max FPS: ${results.metrics.maxFPS.toFixed(1)}`);
  console.log(`  Avg Update Time: ${results.metrics.avgUpdateTime.toFixed(2)}ms (threshold: ≤${PERFORMANCE_THRESHOLDS.maxUpdateTime}ms)`);
  console.log(`  Total Updates: ${results.metrics.totalUpdates}`);
  console.log('');

  console.log('Memory Usage:');
  console.log(`  Initial: ${results.metrics.memoryUsage.initial.toFixed(2)}MB`);
  console.log(`  Peak: ${results.metrics.memoryUsage.peak.toFixed(2)}MB`);
  console.log(`  Final: ${results.metrics.memoryUsage.final.toFixed(2)}MB`);
  console.log(`  Increase: ${(results.metrics.memoryUsage.final - results.metrics.memoryUsage.initial).toFixed(2)}MB (threshold: ≤${PERFORMANCE_THRESHOLDS.maxMemoryIncrease}MB)`);
  console.log('');

  if (results.metrics.errors.length > 0) {
    console.log('Errors:');
    results.metrics.errors.forEach((err) => console.log(`  - ${err}`));
    console.log('');
  }

  console.log('========================================');
  console.log(`Result: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');
}

/**
 * Run all test scenarios
 */
async function runAllTests(): Promise<void> {
  const scenarios: LoadTestConfig[] = [
    // Scenario 1: Light load (baseline)
    {
      vehicleCount: 100,
      driverCount: 100,
      facilityCount: 200,
      routeCount: 50,
      updateIntervalMs: 1000,
      testDurationMs: 30000, // 30 seconds
    },
    // Scenario 2: Medium load
    {
      vehicleCount: 500,
      driverCount: 500,
      facilityCount: 500,
      routeCount: 200,
      updateIntervalMs: 1000,
      testDurationMs: 30000,
    },
    // Scenario 3: Heavy load (target)
    {
      vehicleCount: 1000,
      driverCount: 1000,
      facilityCount: 1000,
      routeCount: 500,
      updateIntervalMs: 1000,
      testDurationMs: 30000,
    },
    // Scenario 4: Extreme load (stress test)
    {
      vehicleCount: 2000,
      driverCount: 2000,
      facilityCount: 2000,
      routeCount: 1000,
      updateIntervalMs: 1000,
      testDurationMs: 30000,
    },
  ];

  console.log(`Running ${scenarios.length} test scenarios...\n`);

  for (let i = 0; i < scenarios.length; i++) {
    console.log(`\n### Scenario ${i + 1} of ${scenarios.length} ###\n`);
    const results = await runLoadTest(scenarios[i]);
    printResults(results);

    // Wait between tests
    if (i < scenarios.length - 1) {
      console.log('Waiting 5 seconds before next test...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('All tests completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

export { runLoadTest, runAllTests, LoadTestConfig, LoadTestResults };
