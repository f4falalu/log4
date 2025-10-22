import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useFacilities } from '@/hooks/useFacilities';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useVehicles } from '@/hooks/useVehicles';
import { useActiveHandoffs } from '@/hooks/useHandoffs';
import TacticalDispatchScheduler from '@/components/dispatch/TacticalDispatchScheduler';
import HandoffManager from '@/components/dispatch/HandoffManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, RefreshCw } from 'lucide-react';

export default function DispatchPage() {
  const { data: facilities = [] } = useFacilities();
  const { data: batches = [] } = useDeliveryBatches();
  const { data: vehicles = [] } = useVehicles();
  const { data: handoffs = [] } = useActiveHandoffs();
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  
  const handleBatchCreate = (batch: any) => {
    console.log('Batch created:', batch);
  };

  const activeBatches = batches.filter(b => b.status === 'in-progress' || b.status === 'planned');
  const activeHandoffsCount = handoffs?.length || 0;
  
  return (
    <Layout>
      <TacticalDispatchScheduler 
        facilities={facilities}
        batches={batches}
        onBatchCreate={handleBatchCreate}
      />
      
      {/* Floating Handoff Manager Button */}
      <Dialog open={handoffDialogOpen} onOpenChange={setHandoffDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 px-6 border border-border backdrop-blur-sm"
            size="lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Manage Handoffs
            {activeHandoffsCount > 0 && (
              <Badge className="ml-2 bg-red-500/10 text-red-700 border-transparent">
                {activeHandoffsCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Handoff Management</DialogTitle>
          </DialogHeader>
          <HandoffManager 
            activeBatches={activeBatches}
            vehicles={vehicles}
            onHandoffCreated={() => setHandoffDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
