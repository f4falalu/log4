// MOD4 PoD History List Component
// Scrollable list of completed deliveries with attestation details

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ProofOfDelivery } from '@/lib/db/schema';
import { getPoDHistory, getPoDStats, PoDStats } from '@/lib/db/pod';
import { PoDStatusBadge } from './PoDStatusBadge';
import { PoDDetailSheet } from './PoDDetailSheet';
import { Button } from '@/components/ui/button';
import { 
  Package, Clock, ChevronRight, Download, 
  CheckCircle2, AlertTriangle, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface PoDHistoryListProps {
  onExportPdf?: (pod: ProofOfDelivery) => void;
}

export function PoDHistoryList({ onExportPdf }: PoDHistoryListProps) {
  const [pods, setPods] = useState<ProofOfDelivery[]>([]);
  const [stats, setStats] = useState<PoDStats | null>(null);
  const [selectedPod, setSelectedPod] = useState<ProofOfDelivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const history = await getPoDHistory({ limit: 20 });
      const statsData = await getPoDStats();

      setPods(history);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load PoD history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Package}
            label="Total"
            value={stats.total}
            color="text-foreground"
          />
          <StatCard
            icon={CheckCircle2}
            label="Perfect"
            value={`${stats.perfectRate.toFixed(0)}%`}
            color="text-success"
          />
          <StatCard
            icon={AlertTriangle}
            label="Flagged"
            value={stats.flagged}
            color="text-warning"
          />
        </div>
      )}

      {/* History list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Deliveries
        </h3>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : pods.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No delivery history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pods.map((pod, index) => (
              <motion.button
                key={pod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors text-left"
                onClick={() => setSelectedPod(pod)}
              >
                {/* Status indicator */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
                  pod.status === 'flagged' ? "bg-warning/20" : "bg-success/20"
                )}>
                  {pod.status === 'flagged' ? (
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {pod.facility_name}
                    </h4>
                    <PoDStatusBadge 
                      status={pod.status} 
                      hasDiscrepancy={pod.has_discrepancy}
                      isProxyDelivery={pod.is_proxy_delivery}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatDistanceToNow(pod.delivered_at, { addSuffix: true })}</span>
                    <span>•</span>
                    <span>{pod.items.length} items</span>
                    <span>•</span>
                    <span>{pod.recipient_name}</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <PoDDetailSheet
        pod={selectedPod}
        open={!!selectedPod}
        onOpenChange={(open) => !open && setSelectedPod(null)}
        onExportPdf={onExportPdf}
      />
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: typeof Package; 
  label: string; 
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border/50">
      <Icon className={cn("w-5 h-5 mb-1", color)} />
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}