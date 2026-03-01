// MOD4 PoD Review Step Component
// Final summary before delivery confirmation

import { motion } from 'framer-motion';
import { DeliveryItem, DiscrepancyReason, Facility } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { 
  Package, MapPin, User, CheckCircle2, AlertTriangle,
  Camera, PenTool, Clock, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface PoDReviewStepProps {
  facility: Facility;
  items: DeliveryItem[];
  hasDiscrepancy: boolean;
  discrepancyReason?: DiscrepancyReason;
  discrepancyNotes?: string;
  recipientName: string;
  recipientRole?: string;
  photo: string | null;
  signature: string | null;
  notes?: string;
  location: LocationData | null;
  isProxyDelivery: boolean;
  proxyReason?: string;
  proxyNotes?: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

const DISCREPANCY_LABELS: Record<DiscrepancyReason, string> = {
  damaged_in_transit: 'Damaged in Transit',
  short_shipment: 'Short Shipment',
  wrong_item: 'Wrong Item',
  refused_by_recipient: 'Refused by Recipient',
  item_not_found: 'Item Not Found',
  other: 'Other',
};

export function PoDReviewStep({
  facility,
  items,
  hasDiscrepancy,
  discrepancyReason,
  discrepancyNotes,
  recipientName,
  recipientRole,
  photo,
  signature,
  notes,
  location,
  isProxyDelivery,
  proxyReason,
  proxyNotes,
  isSubmitting,
  onConfirm,
  onBack,
}: PoDReviewStepProps) {
  const isFlagged = hasDiscrepancy || isProxyDelivery;
  const deliveredCount = items.reduce((sum, item) => sum + item.delivered_quantity, 0);
  const expectedCount = items.reduce((sum, item) => sum + item.expected_quantity, 0);

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-4 rounded-xl flex items-center gap-3",
          isFlagged 
            ? "bg-warning/10 border border-warning/30" 
            : "bg-success/10 border border-success/30"
        )}
      >
        {isFlagged ? (
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
        )}
        <div>
          <p className={cn(
            "text-sm font-semibold",
            isFlagged ? "text-warning" : "text-success"
          )}>
            {isFlagged ? 'Delivery will be flagged' : 'Ready to confirm'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isFlagged 
              ? 'This delivery has discrepancies or location issues' 
              : 'All requirements met for confirmation'}
          </p>
        </div>
      </motion.div>

      {/* Facility */}
      <Section icon={MapPin} title="Facility">
        <p className="text-sm font-semibold text-foreground">{facility.name}</p>
        <p className="text-sm text-muted-foreground">{facility.address}</p>
      </Section>

      {/* Items summary */}
      <Section icon={Package} title="Items Delivered">
        <div className="space-y-2">
          {items.map((item) => {
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
          <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className={cn(
              "text-sm font-mono font-bold",
              deliveredCount === expectedCount ? "text-foreground" : "text-warning"
            )}>
              {deliveredCount}/{expectedCount}
            </span>
          </div>
        </div>
      </Section>

      {/* Discrepancy (if any) */}
      {hasDiscrepancy && discrepancyReason && (
        <Section icon={AlertTriangle} title="Discrepancy" variant="warning">
          <p className="text-sm font-semibold text-foreground">
            {DISCREPANCY_LABELS[discrepancyReason]}
          </p>
          {discrepancyNotes && (
            <p className="text-sm text-muted-foreground mt-1">
              {discrepancyNotes}
            </p>
          )}
        </Section>
      )}

      {/* Recipient */}
      <Section icon={User} title="Recipient">
        <p className="text-sm font-semibold text-foreground">{recipientName}</p>
        {recipientRole && (
          <p className="text-sm text-muted-foreground">{recipientRole}</p>
        )}
      </Section>

      {/* Evidence */}
      <div className="grid grid-cols-2 gap-3">
        {photo && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Photo</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
              <img src={photo} alt="Delivery photo" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        {signature && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Signature</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-secondary p-2">
              <img src={signature} alt="Signature" className="w-full h-full object-contain" />
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      {location && (
        <Section 
          icon={MapPin} 
          title="Location" 
          variant={isProxyDelivery ? 'warning' : 'default'}
        >
          <p className="text-sm text-foreground">
            {isProxyDelivery ? '⚠️ Proxy Delivery' : '✓ Within delivery zone'}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} (±{Math.round(location.accuracy)}m)
          </p>
          {isProxyDelivery && proxyReason && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Reason:</span> {proxyReason}
              </p>
              {proxyNotes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {proxyNotes}
                </p>
              )}
            </div>
          )}
        </Section>
      )}

      {/* Notes */}
      {notes && (
        <Section icon={Clock} title="Notes">
          <p className="text-sm text-muted-foreground">{notes}</p>
        </Section>
      )}

      {/* Timestamp */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        {format(new Date(), 'PPpp')}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          className={cn(
            "flex-1 h-14 text-base font-semibold",
            isFlagged && "bg-warning text-warning-foreground hover:bg-warning/90"
          )}
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5 mr-2" />
          )}
          {isSubmitting ? 'Confirming...' : 'Confirm Delivery'}
        </Button>
      </div>
    </div>
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