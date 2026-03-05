// Permission Hooks
export {
  usePermissions,
  useHasPermission,
  useHasAllPermissions,
  useHasAnyPermission,
  useCanAccessResource,
  usePermissionsByCategory,
  useHasDangerousPermissions,
  type Permission,
} from './usePermissions';

// Role Hooks
export {
  useRoles,
  useRole,
  useUserRoles,
  useHasRole,
  useIsSystemAdmin,
  useAssignRole,
  useRemoveRole,
  useCreateRole,
  useUpdateRolePermissions,
  type Role,
  type RoleWithPermissions,
} from './useRoles';

// Permission Set Hooks
export {
  usePermissionSets,
  usePermissionSet,
  useUserPermissionSets,
  useAssignPermissionSet,
  useRemovePermissionSet,
  useCreatePermissionSet,
  useUpdatePermissionSetPermissions,
  useDeactivatePermissionSet,
  type PermissionSet,
  type PermissionSetWithPermissions,
  type UserPermissionSet,
} from './usePermissionSets';

// Permissions Catalog Hooks
export {
  usePermissionsCatalog,
  usePermissionsCatalogByCategory,
  usePermissionsByResource,
  useDangerousPermissions,
  getCategoryMeta,
  PERMISSION_CATEGORIES,
  type PermissionCatalogItem,
} from './usePermissionsCatalog';

// Audit Log Hooks
export {
  useAuditLogs,
  useCriticalAuditLogs,
  useAuditSummaryByUser,
  useAuditSummaryByResource,
  useResourceAuditLogs,
  exportAuditLogsToCSV,
  type AuditLog,
  type AuditLogFilters,
} from './useAuditLogs';

// Scope Binding Hooks
export {
  useUserScopeBindings,
  useAssignScopeBinding,
  useRemoveScopeBinding,
  useWarehouses,
  usePrograms,
  useFacilities,
  useAdminUnits,
  type ScopeBinding,
  type ScopeBindingDetailed,
} from './useScopeBindings';

// User Permission Hooks (direct per-user grants)
export {
  useUserDirectPermissions,
  useUserEffectivePermissions,
  useSetUserPermission,
  useBulkSetUserPermissions,
  useCopyPermissions,
  type EffectivePermission,
} from './useUserPermissions';

// Group Hooks
export {
  useGroups,
  useGroup,
  useUserGroups,
  useCreateGroup,
  useDeleteGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useUpdateGroupPermissions,
  type UserGroup,
  type GroupWithDetails,
  type GroupMember,
} from './useGroups';

// Notification Preference Hooks
export {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  type NotificationPreference,
  type NotificationType,
  type NotificationChannel,
} from './useNotificationPreferences';

// Workflow State Guard Hooks
export {
  useCanTransitionRequisition,
  useAvailableRequisitionStates,
  useTransitionRequisitionStatus,
  useTransitionInvoiceStatus,
  useTransitionBatchStatus,
  useTransitionSchedulerBatchStatus,
  REQUISITION_STATUS_META,
  INVOICE_STATUS_META,
  BATCH_STATUS_META,
  SCHEDULER_STATUS_META,
} from './useWorkflowGuards';
