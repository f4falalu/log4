import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

interface ApprovalActionsProps {
  requisitionId: string;
  onApprove: (reason?: string) => void;
  onReject: (reason: string) => void;
}

export function ApprovalActions({ requisitionId, onApprove, onReject }: ApprovalActionsProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = () => {
    onApprove(approvalNotes);
    setIsApproveDialogOpen(false);
    setApprovalNotes('');
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    onReject(rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
            <CheckCircle className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Requisition</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this requisition? This will make it available for payload planning.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes about this approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this requisition. This will be visible to the requester.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please explain why this requisition is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
