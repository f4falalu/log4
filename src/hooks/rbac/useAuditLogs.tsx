import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  previous_state: Record<string, any> | null;
  new_state: Record<string, any> | null;
  state_diff: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  metadata: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_name: string | null;
  user_email: string | null;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get audit logs with filters
 */
export function useAuditLogs(filters: AuditLogFilters = {}) {
  const {
    userId,
    action,
    resource,
    severity,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(
          `
          id,
          organization_id,
          user_id,
          action,
          resource,
          resource_id,
          previous_state,
          new_state,
          state_diff,
          ip_address,
          user_agent,
          timestamp,
          metadata,
          severity
        `,
          { count: 'exact' }
        )
        .order('timestamp', { ascending: false });

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (action) {
        query = query.eq('action', action);
      }

      if (resource) {
        query = query.eq('resource', resource);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get user details for each log (join manually)
      const userIds = [...new Set(data.map((log: any) => log.user_id).filter(Boolean))];

      const { data: users } = await supabase
        .from('admin_users_view')
        .select('id, full_name, email')
        .in('id', userIds);

      const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);

      const logsWithUsers = data.map((log: any) => {
        const user = log.user_id ? userMap.get(log.user_id) : null;
        return {
          ...log,
          user_name: user?.full_name || null,
          user_email: user?.email || null,
        };
      });

      return {
        logs: logsWithUsers as AuditLog[],
        total: count || 0,
      };
    },
  });
}

/**
 * Get critical audit logs (high/critical severity only)
 */
export function useCriticalAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ['audit-logs-critical', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs_critical')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

/**
 * Get audit summary by user
 */
export function useAuditSummaryByUser() {
  return useQuery({
    queryKey: ['audit-summary-by-user'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_summary_by_user')
        .select('*')
        .order('total_actions', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get audit summary by resource
 */
export function useAuditSummaryByResource() {
  return useQuery({
    queryKey: ['audit-summary-by-resource'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_summary_by_resource')
        .select('*')
        .order('total_changes', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get audit logs for a specific resource
 */
export function useResourceAuditLogs(resource: string, resourceId: string) {
  return useQuery({
    queryKey: ['audit-logs', resource, resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource', resource)
        .eq('resource_id', resourceId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Get user details
      const userIds = [...new Set(data.map((log) => log.user_id).filter(Boolean))];

      const { data: users } = await supabase
        .from('admin_users_view')
        .select('id, full_name, email')
        .in('id', userIds);

      const userMap = new Map(users?.map((u) => [u.id, u]) || []);

      return data.map((log) => {
        const user = log.user_id ? userMap.get(log.user_id) : null;
        return {
          ...log,
          user_name: user?.full_name || null,
          user_email: user?.email || null,
        } as AuditLog;
      });
    },
  });
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogsToCSV(filters: AuditLogFilters = {}) {
  let query = supabase
    .from('audit_logs')
    .select(
      `
      id,
      timestamp,
      action,
      resource,
      resource_id,
      severity,
      user_id
    `
    )
    .order('timestamp', { ascending: false });

  // Apply same filters as useAuditLogs
  if (filters.userId) query = query.eq('user_id', filters.userId);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.resource) query = query.eq('resource', filters.resource);
  if (filters.severity) query = query.eq('severity', filters.severity);
  if (filters.startDate) query = query.gte('timestamp', filters.startDate);
  if (filters.endDate) query = query.lte('timestamp', filters.endDate);

  // Get all results (no pagination for export)
  const { data, error } = await query.limit(10000);

  if (error) throw error;

  // Convert to CSV
  const headers = ['Timestamp', 'Action', 'Resource', 'Resource ID', 'Severity', 'User ID'];
  const rows = data.map((log: any) => [
    log.timestamp,
    log.action,
    log.resource,
    log.resource_id || '',
    log.severity,
    log.user_id || '',
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
