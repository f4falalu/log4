import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Zap, TrendingDown } from 'lucide-react';
import type { DeliveryBatch } from '@/types';

interface RouteOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batches: DeliveryBatch[];
  onRouteOptimized?: (batchId: string, route: any) => void;
}

interface OptimizationResult {
  currentDistance: number;
  optimizedDistance: number;
  route: any;
  estimatedTime: number;
}

export function RouteOptimizationDialog({ 
  open, 
  onOpenChange,
  batches,
  onRouteOptimized
}: RouteOptimizationDialogProps) {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [preview, setPreview] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    if (!selectedBatch) return;
    
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: { batchId: selectedBatch }
      });
      
      if (error) throw error;
      
      setPreview(data);
      toast.success('Route optimized successfully!');
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize route: ' + (error.message || 'Unknown error'));
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !selectedBatch) return;
    
    try {
      const { error } = await supabase
        .from('delivery_batches')
        .update({ 
          optimized_route: preview.route,
          total_distance: preview.optimizedDistance,
          estimated_duration: preview.estimatedTime 
        })
        .eq('id', selectedBatch);
      
      if (error) throw error;
      
      onRouteOptimized?.(selectedBatch, preview.route);
      toast.success('Optimized route applied!');
      onOpenChange(false);
      setPreview(null);
      setSelectedBatch('');
    } catch (error: any) {
      toast.error('Failed to apply route: ' + error.message);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPreview(null);
    setSelectedBatch('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Optimize Route
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Batch to Optimize
            </label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a delivery batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name} - {batch.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleOptimize}
            disabled={!selectedBatch || isOptimizing}
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Optimize Route
              </>
            )}
          </Button>
          
          {preview && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-success" />
                <h4 className="font-semibold">Optimization Results</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Current Distance</span>
                  <p className="font-medium text-lg">{preview.currentDistance.toFixed(1)} km</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Optimized Distance</span>
                  <p className="font-medium text-lg text-success">
                    {preview.optimizedDistance.toFixed(1)} km
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Distance Saved</span>
                  <p className="font-medium text-success">
                    {(preview.currentDistance - preview.optimizedDistance).toFixed(1)} km
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Efficiency Gain</span>
                  <p className="font-medium text-success">
                    {((preview.currentDistance - preview.optimizedDistance) / preview.currentDistance * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <Button onClick={handleConfirm} className="w-full mt-4">
                Apply Optimized Route
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
