/**
 * TradeOffApproval.tsx
 *
 * Trade-off approval workflow component
 * Phase 5: Operational Map component
 *
 * CRITICAL GOVERNANCE RULES:
 * - Only system-proposed trade-offs can be approved
 * - No manual trade-off creation allowed
 * - All approvals/rejections logged to audit trail
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Handoff (Trade-Off) entity
 */
export interface Handoff {
  id: string;
  workspace_id: string;
  from_batch_id: string;
  to_batch_id: string;
  facility_id: string;
  payload_item_ids: string[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  proposed_by: 'system'; // Always 'system' - enforced by database constraint
  approved_by: string | null;
  approved_at: string | null;
  approval_method: 'ui' | 'api' | null;
  rejection_reason: string | null;
  proposed_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  // Extended fields from view
  from_batch_name?: string;
  to_batch_name?: string;
  facility_name?: string;
  facility_lat?: number;
  facility_lng?: number;
  minutes_pending?: number;
}

/**
 * Trade-Off Approval Props
 */
export interface TradeOffApprovalProps {
  /** System-proposed handoff to approve/reject */
  handoff: Handoff;

  /** Callback when handoff is approved */
  onApprove: (handoffId: string) => Promise<void>;

  /** Callback when handoff is rejected */
  onReject: (handoffId: string, reason: string) => Promise<void>;

  /** Callback when user wants to view details on map */
  onViewOnMap?: (handoff: Handoff) => void;

  /** Disable interaction (loading state) */
  disabled?: boolean;

  /** Compact mode (smaller UI) */
  compact?: boolean;
}

/**
 * Trade-Off Approval Component
 *
 * Features:
 * - Display system-proposed trade-off details
 * - Approve/Reject workflow
 * - Rejection reason input
 * - View on map
 * - Audit trail logging
 *
 * GOVERNANCE ENFORCEMENT:
 * - Only accepts system-proposed handoffs (proposed_by === 'system')
 * - No UI for manual trade-off creation
 * - All actions logged via approval_method: 'ui'
 */
export function TradeOffApproval({
  handoff,
  onApprove,
  onReject,
  onViewOnMap,
  disabled = false,
  compact = false,
}: TradeOffApprovalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  // GOVERNANCE CHECK: Ensure this is a system-proposed handoff
  if (handoff.proposed_by !== 'system') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Governance Violation:</strong> This handoff was not system-proposed.
          Manual trade-offs are forbidden by governance rules.
        </AlertDescription>
      </Alert>
    );
  }

  // Check if already actioned
  const isActioned = handoff.status !== 'pending' || handoff.approved_by !== null;

  /**
   * Handle approve action
   */
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(handoff.id);
      toast.success('Trade-off approved', {
        description: `Handoff from ${handoff.from_batch_name} to ${handoff.to_batch_name} approved successfully.`,
      });
    } catch (error) {
      toast.error('Approval failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Handle reject action
   */
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason required', {
        description: 'Please provide a reason for rejecting this trade-off.',
      });
      return;
    }

    setIsRejecting(true);
    try {
      await onReject(handoff.id, rejectionReason);
      toast.success('Trade-off rejected', {
        description: `Handoff from ${handoff.from_batch_name} to ${handoff.to_batch_name} rejected.`,
      });
      setShowRejectInput(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Rejection failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  /**
   * Format time pending
   */
  const formatTimePending = (minutes: number | undefined): string => {
    if (!minutes) return 'Just now';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${Math.round(minutes)}m ago`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m ago`;
  };

  if (compact) {
    return (
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                System-Proposed Trade-Off
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {handoff.from_batch_name} <ArrowRight className="inline h-3 w-3 mx-1" />{' '}
                {handoff.to_batch_name}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimePending(handoff.minutes_pending)}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="pt-0 pb-3 gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleApprove}
            disabled={disabled || isApproving || isActioned}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectInput(!showRejectInput)}
            disabled={disabled || isRejecting || isActioned}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </CardFooter>
        {showRejectInput && (
          <CardContent className="pt-0 pb-3">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mb-2 text-sm"
              rows={2}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={disabled || isRejecting || !rejectionReason.trim()}
              className="w-full"
            >
              Confirm Rejection
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              System-Proposed Trade-Off
            </CardTitle>
            <CardDescription className="mt-2">
              The system has detected an opportunity to optimize delivery by transferring
              payload between batches.
            </CardDescription>
          </div>
          <Badge variant="outline">
            <Clock className="h-4 w-4 mr-1" />
            {formatTimePending(handoff.minutes_pending)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trade-off details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">From Batch</p>
            <p className="font-medium">{handoff.from_batch_name || handoff.from_batch_id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">To Batch</p>
            <p className="font-medium">{handoff.to_batch_name || handoff.to_batch_id}</p>
          </div>
        </div>

        {/* Facility location */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Handoff Location
          </p>
          <p className="font-medium">{handoff.facility_name || handoff.facility_id}</p>
          {handoff.facility_lat && handoff.facility_lng && (
            <p className="text-xs text-muted-foreground">
              {handoff.facility_lat.toFixed(4)}, {handoff.facility_lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* System reason */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">System Justification</p>
          <p className="text-sm bg-muted p-3 rounded-md">{handoff.reason}</p>
        </div>

        {/* Payload items */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Items to Transfer</p>
          <p className="text-sm font-medium">{handoff.payload_item_ids.length} item(s)</p>
        </div>

        {/* Governance notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Governance:</strong> This trade-off was proposed by the system based on
            optimization algorithms. Your approval is required to execute this change.
          </AlertDescription>
        </Alert>

        {/* Rejection reason input */}
        {showRejectInput && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason</label>
            <Textarea
              placeholder="Explain why this trade-off should not proceed..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {onViewOnMap && (
          <Button
            variant="outline"
            onClick={() => onViewOnMap(handoff)}
            disabled={disabled}
          >
            <MapPin className="h-4 w-4 mr-2" />
            View on Map
          </Button>
        )}
        <div className="flex-1" />
        {!showRejectInput ? (
          <>
            <Button
              variant="outline"
              onClick={() => setShowRejectInput(true)}
              disabled={disabled || isActioned}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={disabled || isApproving || isActioned}
            >
              {isApproving ? (
                'Approving...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Trade-Off
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRejectInput(false);
                setRejectionReason('');
              }}
              disabled={disabled || isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={disabled || isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? (
                'Rejecting...'
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Trade-Off Approval List Component
 *
 * Displays multiple pending handoffs for bulk approval
 */
export interface TradeOffApprovalListProps {
  /** List of pending handoffs */
  handoffs: Handoff[];

  /** Callback when handoff is approved */
  onApprove: (handoffId: string) => Promise<void>;

  /** Callback when handoff is rejected */
  onReject: (handoffId: string, reason: string) => Promise<void>;

  /** Callback when user wants to view details on map */
  onViewOnMap?: (handoff: Handoff) => void;

  /** Show in compact mode */
  compact?: boolean;

  /** Empty state message */
  emptyMessage?: string;
}

export function TradeOffApprovalList({
  handoffs,
  onApprove,
  onReject,
  onViewOnMap,
  compact = false,
  emptyMessage = 'No pending trade-offs',
}: TradeOffApprovalListProps) {
  if (handoffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {handoffs.map((handoff) => (
        <TradeOffApproval
          key={handoff.id}
          handoff={handoff}
          onApprove={onApprove}
          onReject={onReject}
          onViewOnMap={onViewOnMap}
          compact={compact}
        />
      ))}
    </div>
  );
}
