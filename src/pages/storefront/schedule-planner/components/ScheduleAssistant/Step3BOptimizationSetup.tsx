import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import { BatchCard } from './BatchCard';

interface Step3BOptimizationSetupProps {
  warehouseId: string;
  facilityIds: string[];
  optimizationParams: any;
  onParamsChange: (params: any) => void;
  onBatchesGenerated: (batches: any[]) => void;
}

export function Step3BOptimizationSetup({
  warehouseId,
  facilityIds,
  optimizationParams,
  onParamsChange,
  onBatchesGenerated,
}: Step3BOptimizationSetupProps) {
  const { optimizeAsync, isOptimizing } = useRouteOptimization();
  const [results, setResults] = useState<any[]>([]);

  const handleOptimize = async () => {
    try {
      const result = await optimizeAsync({
        warehouseId,
        facilityIds,
        vehicleType: 'van',
        priority: 'medium',
      });

      // Mock batch generation for now
      const batches = [
        {
          id: 'batch-1',
          name: 'Batch 1',
          facilityIds: facilityIds.slice(0, Math.ceil(facilityIds.length / 2)),
          estimatedDistance: result.totalDistance * 0.6,
          estimatedDuration: result.estimatedDuration * 0.6,
          capacityUsedPct: 75,
        },
        {
          id: 'batch-2',
          name: 'Batch 2',
          facilityIds: facilityIds.slice(Math.ceil(facilityIds.length / 2)),
          estimatedDistance: result.totalDistance * 0.4,
          estimatedDuration: result.estimatedDuration * 0.4,
          capacityUsedPct: 65,
        },
      ];

      setResults(batches);
      onBatchesGenerated(batches);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">AI Route Optimization</h2>
        <p className="text-muted-foreground mt-1">
          Configure parameters and let AI generate optimal routes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Capacity Threshold: {optimizationParams.capacityThreshold}%</Label>
              <Slider
                value={[optimizationParams.capacityThreshold]}
                onValueChange={([value]) => onParamsChange({ capacityThreshold: value })}
                min={60}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Time Windows</Label>
              <Select
                value={optimizationParams.timeWindows}
                onValueChange={(value) => onParamsChange({ timeWindows: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Priority Weights</Label>
              
              {(['distance', 'duration', 'cost'] as const).map((metric) => (
                <div key={metric} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{metric}</span>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={
                          optimizationParams.priorityWeights[metric] === level
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          onParamsChange({
                            priorityWeights: {
                              ...optimizationParams.priorityWeights,
                              [metric]: level,
                            },
                          })
                        }
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || facilityIds.length === 0}
              className="w-full gap-2"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Optimization
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Results */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isOptimizing && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Calculating optimal routes...
                </p>
              </div>
            )}

            {!isOptimizing && results.length === 0 && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Run optimization to see results
              </div>
            )}

            {!isOptimizing && results.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  ✓ Completed — {results.length} batches generated
                </div>
                {results.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
