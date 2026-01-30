/**
 * Onboarding Types
 *
 * Type definitions for the platform onboarding system including:
 * - Organization status tracking
 * - User status tracking
 * - Invitation system
 * - Workspace readiness
 */

// =====================================================
// Organization Status
// =====================================================

export type OrgStatus =
  | 'org_created'
  | 'admin_assigned'
  | 'basic_config_complete'
  | 'operational_config_complete'
  | 'active';

export type OperatingModel = 'owned_fleet' | 'contracted' | 'hybrid';

export interface OrganizationConfig {
  operating_model: OperatingModel | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
}

export interface OrganizationStatusHistory {
  id: string;
  workspace_id: string;
  previous_status: OrgStatus | null;
  new_status: OrgStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// =====================================================
// User Status
// =====================================================

export type UserStatus = 'invited' | 'registered' | 'role_assigned' | 'active';

export interface UserOnboardingStatus {
  user_id: string;
  user_status: UserStatus;
  onboarding_completed: boolean;
  has_workspace: boolean;
  has_role: boolean;
  workspaces: UserWorkspace[] | null;
}

export interface UserWorkspace {
  workspace_id: string;
  workspace_name: string;
  workspace_role: WorkspaceRole;
  org_status: OrgStatus;
  is_ready: boolean;
}

export interface UserStatusHistory {
  id: string;
  user_id: string;
  previous_status: UserStatus | null;
  new_status: UserStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// =====================================================
// Invitation System
// =====================================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserInvitation {
  id: string;
  email: string;
  workspace_id: string;
  pre_assigned_role: string; // app_role
  workspace_role: WorkspaceRole;
  invitation_token: string;
  status: InvitationStatus;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  personal_message: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  workspace_id: string;
  workspace_name: string;
  pre_assigned_role: string;
  workspace_role: WorkspaceRole;
  invitation_token: string;
  invited_by: string;
  invited_by_name: string | null;
  invited_at: string;
  expires_at: string;
  personal_message: string | null;
  hours_until_expiry: number;
}

export interface InvitationDetails {
  id: string;
  email: string;
  workspace_id: string;
  workspace_name: string;
  pre_assigned_role: string;
  workspace_role: WorkspaceRole;
  invited_by_name: string | null;
  invited_at: string;
  expires_at: string;
  personal_message: string | null;
  is_valid: boolean;
  error?: string;
}

export interface InviteUserParams {
  email: string;
  workspace_id: string;
  app_role: string;
  workspace_role?: WorkspaceRole;
  personal_message?: string;
}

export interface AcceptInvitationResult {
  invitation_id: string;
  workspace_id: string;
  workspace_name: string;
  app_role: string;
  workspace_role: WorkspaceRole;
}

// =====================================================
// Workspace Readiness
// =====================================================

export type ReadinessGate =
  | 'admin'
  | 'rbac'
  | 'warehouse'
  | 'vehicle'
  | 'packaging_rules';

export interface WorkspaceReadiness {
  workspace_id: string;
  workspace_name?: string;
  org_status?: OrgStatus;
  has_admin: boolean;
  has_rbac_configured: boolean;
  has_warehouse: boolean;
  has_vehicle: boolean;
  has_packaging_rules: boolean;
  is_ready: boolean;
  missing_items: ReadinessGate[];
  progress_percentage: number;
  timestamps?: {
    admin_configured_at: string | null;
    first_warehouse_at: string | null;
    first_vehicle_at: string | null;
    packaging_configured_at: string | null;
    became_ready_at: string | null;
  };
}

export interface ReadinessCheckResult {
  is_ready: boolean;
  missing_items: ReadinessGate[];
  progress_percentage: number;
}

// =====================================================
// Onboarding Wizard Types
// =====================================================

export type OnboardingWizardStep =
  | 'country'
  | 'workspace'
  | 'operating_model'
  | 'primary_contact'
  | 'boundaries'
  | 'complete';

export interface OnboardingWizardState {
  currentStep: OnboardingWizardStep;
  selectedCountry: {
    id: string;
    name: string;
    iso_code: string;
    iso3_code: string;
  } | null;
  workspaceName: string;
  workspaceSlug: string;
  operatingModel: OperatingModel | null;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  createdWorkspaceId: string | null;
  isSubmitting: boolean;
  error: string | null;
}

export interface CreateOrganizationParams {
  name: string;
  slug: string;
  country_id: string;
  operating_model?: OperatingModel;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
}

export interface UpdateWorkspaceConfigParams {
  workspace_id: string;
  operating_model?: OperatingModel;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
}

// =====================================================
// Operational Setup Types
// =====================================================

export interface OperationalSetupState {
  currentStep: 'warehouse' | 'vehicle' | 'review' | 'complete';
  warehouseAdded: boolean;
  vehicleAdded: boolean;
  workspaceId: string;
}

// =====================================================
// RPC Function Return Types
// =====================================================

export interface CreateOrganizationResult {
  workspace_id: string;
}

export interface AdvanceOrgStatusResult {
  new_status: OrgStatus;
}

export interface UpdateWorkspaceConfigResult {
  workspace_id: string;
  org_status: OrgStatus;
  updated: boolean;
}

// =====================================================
// Validation Helpers
// =====================================================

export const ORG_STATUS_ORDER: OrgStatus[] = [
  'org_created',
  'admin_assigned',
  'basic_config_complete',
  'operational_config_complete',
  'active',
];

export const USER_STATUS_ORDER: UserStatus[] = [
  'invited',
  'registered',
  'role_assigned',
  'active',
];

export const OPERATING_MODELS: { value: OperatingModel; label: string; description: string }[] = [
  {
    value: 'owned_fleet',
    label: 'Owned Fleet',
    description: 'Your organization owns and operates its delivery vehicles',
  },
  {
    value: 'contracted',
    label: 'Contracted Fleet',
    description: 'Third-party logistics providers handle all deliveries',
  },
  {
    value: 'hybrid',
    label: 'Hybrid Model',
    description: 'Mix of owned vehicles and contracted logistics partners',
  },
];

export const WORKSPACE_ROLES: { value: WorkspaceRole; label: string; description: string }[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full control over workspace settings and members',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage users, invitations, and most settings',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Standard access to workspace features',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to workspace data',
  },
];

/**
 * Check if an organization status transition is valid
 */
export function isValidOrgStatusTransition(
  from: OrgStatus,
  to: OrgStatus
): boolean {
  const fromIndex = ORG_STATUS_ORDER.indexOf(from);
  const toIndex = ORG_STATUS_ORDER.indexOf(to);
  return toIndex === fromIndex + 1;
}

/**
 * Check if a user status transition is valid
 */
export function isValidUserStatusTransition(
  from: UserStatus,
  to: UserStatus
): boolean {
  const fromIndex = USER_STATUS_ORDER.indexOf(from);
  const toIndex = USER_STATUS_ORDER.indexOf(to);
  return toIndex === fromIndex + 1;
}

/**
 * Get human-readable label for org status
 */
export function getOrgStatusLabel(status: OrgStatus): string {
  const labels: Record<OrgStatus, string> = {
    org_created: 'Organization Created',
    admin_assigned: 'Admin Assigned',
    basic_config_complete: 'Basic Configuration Complete',
    operational_config_complete: 'Operational Setup Complete',
    active: 'Active',
  };
  return labels[status];
}

/**
 * Get human-readable label for user status
 */
export function getUserStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    invited: 'Invited',
    registered: 'Registered',
    role_assigned: 'Role Assigned',
    active: 'Active',
  };
  return labels[status];
}

/**
 * Get human-readable label for readiness gate
 */
export function getReadinessGateLabel(gate: ReadinessGate): string {
  const labels: Record<ReadinessGate, string> = {
    admin: 'Admin User',
    rbac: 'Access Control',
    warehouse: 'Warehouse',
    vehicle: 'Vehicle',
    packaging_rules: 'Packaging Rules',
  };
  return labels[gate];
}
