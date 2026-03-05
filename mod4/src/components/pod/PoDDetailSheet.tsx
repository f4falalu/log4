// MOD4 PoD Detail Sheet Component
// Full proof of delivery details view

import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ProofOfDelivery, DiscrepancyReason } from '@/lib/db/schema';
import { PoDStatusBadge } from './PoDStatusBadge';
import { 
  Package, MapPin, User, Camera, PenTool, Clock, 
  AlertTriangle, Download, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PoDDetailSheetProps {
  pod: ProofOfDelivery | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportPdf?: (pod: ProofOfDelivery) => void;
}

const DISCREPANCY_LABELS: Record<DiscrepancyReason, string> = {
  damaged_in_transit: 'Damaged in Transit',
  short_shipment: 'Short Shipment',
  wrong_item: 'Wrong Item',
  refused_by_recipient: 'Refused by Recipient',
  item_not_found: 'Item Not Found',
  other: 'Other',
};

export function PoDDetailSheet({ pod, open, onOpenChange, onExportPdf }: PoDDetailSheetProps) {
  if (!pod) return null;

  const deliveredCount = pod.items.reduce((sum, item) => sum + item.delivered_quantity, 0);
  const expectedCount = pod.items.reduce((sum, item) => sum + item.expected_quantity, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-left text-lg">
                  Proof of Delivery
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(pod.delivered_at, 'PPp')}
                </p>
              </div>
              <PoDStatusBadge 
                status={pod.status} 
                hasDiscrepancy={pod.has_discrepancy}
                isProxyDelivery={pod.is_proxy_delivery}
              />
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Facility */}
            <Section icon={MapPin} title="Facility">
              <p className="text-sm font-semibold text-foreground">{pod.facility_name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                ID: {pod.facility_id}
              </p>
            </Section>

            {/* Items */}
            <Section icon={Package} title="Items Delivered">
              <div className="space-y-2">
                {pod.items.map((item) => {
                  const isMatch = item.delivered_quantity === item.expected_quantity;
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{item.name}</span>
                      <span className={cn(
                        "text-sm font-mono font-semibold",
                        isMatch ? "text-foreground" : "text-warning"
                      )}>
                        {item.delivered_quantity}/{item.expected_quantity} {item.unit}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-border/50 flex justify-between">
                  <span className="text-sm font-semibold">Total</span>
                  <span className={cn(
                    "text-sm font-mono font-bold",
                    deliveredCount === expectedCount ? "text-foreground" : "text-warning"
                  )}>
                    {deliveredCount}/{expectedCount}
                  </span>
                </div>
              </div>
            </Section>

            {/* Discrepancy */}
            {pod.has_discrepancy && pod.discrepancy_reason && (
              <Section icon={AlertTriangle} title="Discrepancy" variant="warning">
                <p className="text-sm font-semibold text-foreground">
                  {DISCREPANCY_LABELS[pod.discrepancy_reason]}
                </p>
                {pod.discrepancy_notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {pod.discrepancy_notes}
                  </p>
                )}
              </Section>
            )}

            {/* Recipient */}
            <Section icon={User} title="Recipient">
              <p className="text-sm font-semibold text-foreground">{pod.recipient_name}</p>
              {pod.recipient_role && (
                <p className="text-sm text-muted-foreground">{pod.recipient_role}</p>
              )}
            </Section>

            {/* Evidence */}
            <div className="grid grid-cols-2 gap-3">
              {pod.photo_url && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Photo</span>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
                    <img src={pod.photo_url} alt="Delivery" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {pod.recipient_signature_url && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Signature</span>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-secondary p-2">
                    <img src={pod.recipient_signature_url} alt="Signature" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            <Section 
              icon={MapPin} 
              title="Location" 
              variant={pod.is_proxy_delivery ? 'warning' : 'default'}
            >
              <p className="text-sm text-foreground">
                {pod.is_proxy_delivery ? '⚠️ Proxy Delivery' : '✓ Within delivery zone'}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {pod.delivery_latitude.toFixed(6)}, {pod.delivery_longitude.toFixed(6)} (±{Math.round(pod.location_accuracy_m)}m)
              </p>
              {pod.is_proxy_delivery && pod.proxy_reason && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Reason:</span> {pod.proxy_reason}
                  </p>
                  {pod.proxy_notes && (
                    <p className="text-sm text-muted-foreground mt-1">{pod.proxy_notes}</p>
                  )}
                </div>
              )}
            </Section>

            {/* Notes */}
            {pod.notes && (
              <Section icon={Clock} title="Notes">
                <p className="text-sm text-muted-foreground">{pod.notes}</p>
              </Section>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-secondary/50">
              <p><span className="font-semibold">PoD ID:</span> {pod.id}</p>
              <p><span className="font-semibold">Slot ID:</span> {pod.slot_id}</p>
              <p><span className="font-semibold">Batch ID:</span> {pod.batch_id}</p>
              <p><span className="font-semibold">Driver ID:</span> {pod.driver_id}</p>
              <p><span className="font-semibold">Created:</span> {format(pod.created_at, 'PPpp')}</p>
              {pod.synced_at && (
                <p><span className="font-semibold">Synced:</span> {format(pod.synced_at, 'PPpp')}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border/50 bg-background">
            <Button 
              className="w-full h-12 font-semibold"
              onClick={() => onExportPdf?.(pod)}
            >
              <Download className="w-5 h-5 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ 
  icon: Icon, 
  title, 
  children, 
  variant = 'default' 
}: { 
  icon: typeof Package; 
  title: string; 
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}) {
  return (
    <div className={cn(
      "p-4 rounded-xl",
      variant === 'warning' 
        ? "bg-warning/5 border border-warning/20" 
        : "bg-card border border-border/50"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn(
          "w-4 h-4",
          variant === 'warning' ? "text-warning" : "text-muted-foreground"
        )} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}