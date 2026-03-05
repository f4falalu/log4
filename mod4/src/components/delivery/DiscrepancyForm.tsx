// MOD4 Discrepancy Form Component
// Capture reason and justification for quantity mismatches

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DeliveryItem, DiscrepancyReason } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, Package, Truck, XCircle, 
  HelpCircle, Ban, FileQuestion 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscrepancyFormProps {
  items: DeliveryItem[];
  selectedReason: DiscrepancyReason | null;
  notes: string;
  onReasonChange: (reason: DiscrepancyReason) => void;
  onNotesChange: (notes: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const DISCREPANCY_REASONS: { value: DiscrepancyReason; label: string; icon: typeof Package; description: string }[] = [
  { value: 'damaged_in_transit', label: 'Damaged in Transit', icon: Truck, description: 'Items were damaged during transport' },
  { value: 'short_shipment', label: 'Short Shipment', icon: Package, description: 'Fewer items were loaded than expected' },
  { value: 'wrong_item', label: 'Wrong Item', icon: XCircle, description: 'Incorrect items were included' },
  { value: 'refused_by_recipient', label: 'Refused by Recipient', icon: Ban, description: 'Recipient refused to accept items' },
  { value: 'item_not_found', label: 'Item Not Found', icon: FileQuestion, description: 'Items missing from delivery' },
  { value: 'other', label: 'Other', icon: HelpCircle, description: 'Other reason (specify below)' },
];

export function DiscrepancyForm({
  items,
  selectedReason,
  notes,
  onReasonChange,
  onNotesChange,
  onContinue,
  onBack,
}: DiscrepancyFormProps) {
  const discrepantItems = items.filter(item => item.delivered_quantity !== item.expected_quantity);
  const canContinue = selectedReason && notes.trim().length >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Discrepancy Resolution Required
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {discrepantItems.length} item{discrepantItems.length > 1 ? 's' : ''} with quantity mismatch
          </p>
        </div>
      </div>

      {/* Affected items summary */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Affected Items
        </h4>
        <div className="space-y-2">
          {discrepantItems.map((item) => {
            const diff = item.delivered_quantity - item.expected_quantity;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50"
              >
                <span className="text-sm text-foreground font-medium">
                  {item.name}
                </span>
                <span className={cn(
                  "text-sm font-semibold",
                  diff < 0 ? "text-warning" : "text-info"
                )}>
                  {item.expected_quantity} → {item.delivered_quantity} ({diff > 0 ? '+' : ''}{diff})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reason selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Reason <span className="text-destructive">*</span>
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {DISCREPANCY_REASONS.map((reason) => {
            const Icon = reason.icon;
            const isSelected = selectedReason === reason.value;
            
            return (
              <motion.button
                key={reason.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => onReasonChange(reason.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-colors",
                  isSelected 
                    ? "bg-primary/10 border-primary/50" 
                    : "bg-card border-border/50 hover:border-primary/30"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {reason.label}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {reason.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Justification notes */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Justification <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="Provide details about the discrepancy (minimum 10 characters)..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[100px] resize-none"
          required
        />
        <p className="text-xs text-muted-foreground">
          {notes.length}/10 minimum characters
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          className="flex-1 h-12 font-semibold"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}