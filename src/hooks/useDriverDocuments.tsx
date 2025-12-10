/**
 * useDriverDocuments Hook
 * Manages driver document operations (fetch, upload, delete, update)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  uploadDate: string;
  uploadedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  notes?: string;
  thumbnailUrl?: string;
}

interface UploadDocumentParams {
  driverId: string;
  file: File;
  documentType: string;
  expiryDate?: string;
  notes?: string;
}

/**
 * Fetch all documents for a specific driver
 */
export function useDriverDocuments(driverId: string | null) {
  return useQuery({
    queryKey: ['driver-documents', driverId],
    queryFn: async () => {
      if (!driverId) return [];

      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      return data.map((doc) => ({
        id: doc.id,
        driverId: doc.driver_id,
        documentType: doc.document_type,
        fileUrl: doc.file_url,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        expiryDate: doc.expiry_date,
        uploadDate: doc.upload_date,
        uploadedBy: doc.uploaded_by,
        status: doc.status,
        notes: doc.notes,
      })) as DriverDocument[];
    },
    enabled: !!driverId,
  });
}

/**
 * Upload a new document for a driver
 */
export function useUploadDriverDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ driverId, file, documentType, expiryDate, notes }: UploadDocumentParams) => {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${driverId}/${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `driver-documents/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Insert document record
      const { data, error } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: driverId,
          document_type: documentType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          expiry_date: expiryDate || null,
          notes: notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Document Uploaded', {
        description: 'Document has been uploaded successfully',
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Upload Failed', {
        description: error instanceof Error ? error.message : 'Failed to upload document',
      });
    },
  });
}

/**
 * Delete a driver document
 */
export function useDeleteDriverDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, driverId }: { documentId: string; driverId: string }) => {
      // 1. Get document details to delete from storage
      const { data: doc, error: fetchError } = await supabase
        .from('driver_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Delete from storage (extract path from URL)
      const urlParts = doc.file_url.split('/documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('documents').remove([filePath]);
      }

      // 3. Delete database record
      const { error } = await supabase
        .from('driver_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      return { documentId, driverId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', data.driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Document Deleted', {
        description: 'Document has been removed successfully',
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Delete Failed', {
        description: error instanceof Error ? error.message : 'Failed to delete document',
      });
    },
  });
}

/**
 * Update document status (approve/reject)
 */
export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      driverId,
      status,
      notes,
    }: {
      documentId: string;
      driverId: string;
      status: 'approved' | 'rejected' | 'pending' | 'expired';
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('driver_documents')
        .update({ status, notes: notes || null })
        .eq('id', documentId);

      if (error) throw error;

      return { documentId, driverId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', data.driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Status Updated', {
        description: `Document ${data.status}`,
      });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Update Failed', {
        description: error instanceof Error ? error.message : 'Failed to update document status',
      });
    },
  });
}

/**
 * Check for expiring documents
 */
export function useExpiringDocuments(driverId: string | null, daysThreshold = 30) {
  return useQuery({
    queryKey: ['expiring-documents', driverId, daysThreshold],
    queryFn: async () => {
      if (!driverId) return [];

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thresholdDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      return data;
    },
    enabled: !!driverId,
  });
}
