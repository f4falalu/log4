import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Requisition {
  id: string;
  facility_id: string;
  created_by?: string;
  approved_by?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  requisition_type: 'routine' | 'emergency';
  requisition_number: string;
  total_items: number;
  total_volume: number;
  total_weight: number;
  invoice_url?: string;
  expected_delivery_date?: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  completed_at?: string;
  facility?: {
    id: string;
    name: string;
    type: string;
    address: string;
  };
  items?: RequisitionItem[];
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  pack_size?: string;
  unit: string;
  weight_kg: number;
  volume_m3: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  created_at: string;
}

export interface CreateRequisitionData {
  facility_id: string;
  requisition_type: 'routine' | 'emergency';
  expected_delivery_date?: string;
  notes?: string;
  items: Omit<RequisitionItem, 'id' | 'requisition_id' | 'created_at'>[];
}

export interface UpdateRequisitionData {
  status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  rejection_reason?: string;
  approved_by?: string;
  expected_delivery_date?: string;
}

// Get all requisitions with optional filtering
export function useRequisitions(filters?: {
  status?: string;
  facility_id?: string;
  requisition_type?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['requisitions', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('requisitions')
        .select(`
          *,
          facility:facilities(id, name, type, address),
          items:requisition_items(*)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.facility_id && filters.facility_id !== 'all') {
        query = query.eq('facility_id', filters.facility_id);
      }
      if (filters?.requisition_type && filters.requisition_type !== 'all') {
        query = query.eq('requisition_type', filters.requisition_type);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Requisition[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Get single requisition with details
export function useRequisition(id: string) {
  return useQuery({
    queryKey: ['requisition', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('requisitions')
        .select(`
          *,
          facility:facilities(id, name, type, address, zone, contact_person, phone),
          items:requisition_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Requisition;
    },
    enabled: !!id,
  });
}

// Get approved requisitions for payload planning
export function useApprovedRequisitions() {
  return useQuery({
    queryKey: ['approved-requisitions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('requisitions')
        .select(`
          *,
          facility:facilities(id, name, type, address),
          items:requisition_items(*)
        `)
        .eq('status', 'approved')
        .order('expected_delivery_date', { ascending: true });

      if (error) throw error;
      return data as Requisition[];
    },
    refetchInterval: 15000,
  });
}

// Create new requisition
export function useCreateRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRequisitionData) => {
      // Create requisition
      const { data: requisition, error: reqError } = await (supabase as any)
        .from('requisitions')
        .insert({
          facility_id: data.facility_id,
          requisition_type: data.requisition_type,
          expected_delivery_date: data.expected_delivery_date,
          notes: data.notes,
          status: 'draft'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Create requisition items
      if (data.items.length > 0) {
        const itemsWithRequisitionId = data.items.map(item => ({
          ...item,
          requisition_id: requisition.id
        }));

        const { error: itemsError } = await (supabase as any)
          .from('requisition_items')
          .insert(itemsWithRequisitionId);

        if (itemsError) throw itemsError;
      }

      return requisition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast.success('Requisition created successfully');
    },
    onError: (error: any) => {
      console.error('Create requisition error:', error);
      toast.error(`Failed to create requisition: ${error.message}`);
    }
  });
}

// Update requisition
export function useUpdateRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRequisitionData }) => {
      const updateData: any = { ...data, updated_at: new Date().toISOString() };
      
      // Add timestamps for status changes
      if (data.status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: requisition, error } = await (supabase as any)
        .from('requisitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return requisition;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['approved-requisitions'] });
      
      const statusMessages = {
        approved: 'Requisition approved successfully',
        rejected: 'Requisition rejected',
        completed: 'Requisition marked as completed',
        pending: 'Requisition submitted for approval'
      };
      
      const message = statusMessages[variables.data.status as keyof typeof statusMessages] || 'Requisition updated successfully';
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(`Failed to update requisition: ${error.message}`);
    }
  });
}

// Delete requisition
export function useDeleteRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('requisitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast.success('Requisition deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete requisition: ${error.message}`);
    }
  });
}

// Add item to requisition
export function useAddRequisitionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<RequisitionItem, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase as any)
        .from('requisition_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', variables.requisition_id] });
      toast.success('Item added to requisition');
    },
    onError: (error: any) => {
      toast.error(`Failed to add item: ${error.message}`);
    }
  });
}

// Update requisition item
export function useUpdateRequisitionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RequisitionItem> }) => {
      const { data: item, error } = await (supabase as any)
        .from('requisition_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['requisition', data.requisition_id] });
      toast.success('Item updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update item: ${error.message}`);
    }
  });
}

// Delete requisition item
export function useDeleteRequisitionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the requisition_id before deleting
      const { data: item } = await (supabase as any)
        .from('requisition_items')
        .select('requisition_id')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('requisition_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return item?.requisition_id;
    },
    onSuccess: (requisitionId) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      if (requisitionId) {
        queryClient.invalidateQueries({ queryKey: ['requisition', requisitionId] });
      }
      toast.success('Item removed from requisition');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove item: ${error.message}`);
    }
  });
}

// Get requisition analytics
export function useRequisitionAnalytics() {
  return useQuery({
    queryKey: ['requisition-analytics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('requisition_analytics')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}
