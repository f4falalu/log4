import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// REQUISITION WORKFLOW GUARDS
// =====================================================

export function useCanTransitionRequisition(requisitionId: string | undefined, newStatus: string) {
  return useQuery({
    queryKey: ['can-transition-requisition', requisitionId, newStatus],
    queryFn: async () => {
      if (!requisitionId) return false;

      const { data, error } = await supabase.rpc('can_transition_requisition_status', {
        _requisition_id: requisitionId,
        _new_status: newStatus,
      });

      if (error) throw error;
      return data as boolean;
    },
    enabled: !!requisitionId && !!newStatus,
    staleTime: 30000, // 30 seconds
  });
}

export function useAvailableRequisitionStates(requisitionId: string | undefined) {
  return useQuery({
    queryKey: ['available-requisition-states', requisitionId],
    queryFn: async () => {
      if (!requisitionId) return [];

      const { data, error } = await supabase.rpc('get_available_requisition_states', {
        _requisition_id: requisitionId,
      });

      if (error) throw error;
      return data as string[];
    },
    enabled: !!requisitionId,
    staleTime: 30000,
  });
}

export function useTransitionRequisitionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      requisitionId,
      newStatus,
      notes,
    }: {
      requisitionId: string;
      newStatus: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('requisitions')
        .update({
          status: newStatus,
          ...(notes && { notes }),
        })
        .eq('id', requisitionId)
        .select()
        .single();

      if (error) {
        // Extract permission error from PostgreSQL exception
        if (error.message.includes('Permission denied')) {
          throw new Error(error.message);
        }
        if (error.message.includes('Invalid state transition')) {
          throw new Error(error.message);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisition', variables.requisitionId] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['available-requisition-states'] });

      toast({
        title: 'Status updated',
        description: `Requisition status changed to ${variables.newStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Status update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =====================================================
// INVOICE WORKFLOW GUARDS
// =====================================================

export function useTransitionInvoiceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      newStatus,
      notes,
    }: {
      invoiceId: string;
      newStatus: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          ...(notes && { notes }),
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        if (error.message.includes('Permission denied')) {
          throw new Error(error.message);
        }
        if (error.message.includes('Invalid state transition')) {
          throw new Error(error.message);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      toast({
        title: 'Status updated',
        description: `Invoice status changed to ${variables.newStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Status update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =====================================================
// BATCH WORKFLOW GUARDS
// =====================================================

export function useTransitionBatchStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      batchId,
      newStatus,
    }: {
      batchId: string;
      newStatus: 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
    }) => {
      const { data, error } = await supabase
        .from('delivery_batches')
        .update({ status: newStatus })
        .eq('id', batchId)
        .select()
        .single();

      if (error) {
        if (error.message.includes('Permission denied')) {
          throw new Error(error.message);
        }
        if (error.message.includes('Invalid state transition')) {
          throw new Error(error.message);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batch', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });

      toast({
        title: 'Status updated',
        description: `Batch status changed to ${variables.newStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Status update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =====================================================
// SCHEDULER BATCH WORKFLOW GUARDS
// =====================================================

export function useTransitionSchedulerBatchStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      schedulerId,
      newStatus,
    }: {
      schedulerId: string;
      newStatus: 'draft' | 'ready' | 'scheduled' | 'published' | 'cancelled';
    }) => {
      const { data, error } = await supabase
        .from('scheduler_batches')
        .update({ status: newStatus })
        .eq('id', schedulerId)
        .select()
        .single();

      if (error) {
        if (error.message.includes('Permission denied')) {
          throw new Error(error.message);
        }
        if (error.message.includes('Invalid state transition')) {
          throw new Error(error.message);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-batch', variables.schedulerId] });
      queryClient.invalidateQueries({ queryKey: ['scheduler-batches'] });

      toast({
        title: 'Status updated',
        description: `Schedule status changed to ${variables.newStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Status update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// =====================================================
// STATUS METADATA
// =====================================================

export const REQUISITION_STATUS_META = {
  pending: { label: 'Pending', color: 'gray', description: 'Awaiting approval' },
  approved: { label: 'Approved', color: 'green', description: 'Approved by warehouse' },
  packaged: { label: 'Packaged', color: 'blue', description: 'Packaging computed' },
  ready_for_dispatch: {
    label: 'Ready for Dispatch',
    color: 'cyan',
    description: 'Ready for batch assignment',
  },
  assigned_to_batch: {
    label: 'Assigned to Batch',
    color: 'purple',
    description: 'Assigned to delivery batch',
  },
  in_transit: { label: 'In Transit', color: 'indigo', description: 'Delivery in progress' },
  fulfilled: { label: 'Fulfilled', color: 'green', description: 'Successfully delivered' },
  partially_delivered: {
    label: 'Partially Delivered',
    color: 'yellow',
    description: 'Partially completed',
  },
  failed: { label: 'Failed', color: 'red', description: 'Delivery failed' },
  rejected: { label: 'Rejected', color: 'red', description: 'Rejected by warehouse' },
  cancelled: { label: 'Cancelled', color: 'gray', description: 'Cancelled before delivery' },
} as const;

export const INVOICE_STATUS_META = {
  draft: { label: 'Draft', color: 'gray', description: 'Being prepared' },
  ready: { label: 'Ready', color: 'blue', description: 'Ready for packaging' },
  packaging_pending: { label: 'Packaging Pending', color: 'yellow', description: 'Awaiting packaging' },
  packaged: { label: 'Packaged', color: 'purple', description: 'Packaged and ready for dispatch' },
  dispatched: { label: 'Dispatched', color: 'indigo', description: 'In transit to facility' },
  completed: { label: 'Completed', color: 'green', description: 'Delivered successfully' },
  cancelled: { label: 'Cancelled', color: 'gray', description: 'Cancelled' },
} as const;

export const BATCH_STATUS_META = {
  planned: { label: 'Planned', color: 'gray', description: 'Being planned' },
  assigned: { label: 'Assigned', color: 'blue', description: 'Driver assigned' },
  'in-progress': { label: 'In Progress', color: 'purple', description: 'Delivery underway' },
  completed: { label: 'Completed', color: 'green', description: 'Delivery completed' },
  cancelled: { label: 'Cancelled', color: 'gray', description: 'Cancelled' },
} as const;

export const SCHEDULER_STATUS_META = {
  draft: { label: 'Draft', color: 'gray', description: 'Being drafted' },
  ready: { label: 'Ready', color: 'blue', description: 'Ready for optimization' },
  scheduled: { label: 'Scheduled', color: 'purple', description: 'Optimized and scheduled' },
  published: { label: 'Published', color: 'green', description: 'Published to drivers' },
  cancelled: { label: 'Cancelled', color: 'gray', description: 'Cancelled' },
} as const;
