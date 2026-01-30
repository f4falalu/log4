/**
 * Invite User Dialog
 *
 * Modal dialog for inviting new users to a workspace.
 * Allows setting email, app role, and workspace role.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInviteUser } from '@/hooks/useInvitations';
import { UserPlus, Mail, Loader2 } from 'lucide-react';
import type { WorkspaceRole } from '@/types/onboarding';
import { WORKSPACE_ROLES } from '@/types/onboarding';
import type { AppRole } from '@/types';

interface InviteUserDialogProps {
  workspaceId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const APP_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'warehouse_officer', label: 'Warehouse Officer', description: 'Manages warehouses and batches' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Assigns drivers and manages dispatch' },
  { value: 'driver', label: 'Driver', description: 'Executes deliveries via Mod4' },
  { value: 'zonal_manager', label: 'Zonal Manager', description: 'Oversees zonal operations' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

export function InviteUserDialog({ workspaceId, trigger, onSuccess }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [appRole, setAppRole] = useState<AppRole | ''>('');
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole>('member');
  const [personalMessage, setPersonalMessage] = useState('');

  const inviteUser = useInviteUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !appRole) return;

    try {
      await inviteUser.mutateAsync({
        email,
        workspace_id: workspaceId,
        app_role: appRole,
        workspace_role: workspaceRole,
        personal_message: personalMessage || undefined,
      });

      // Reset form and close dialog
      setEmail('');
      setAppRole('');
      setWorkspaceRole('member');
      setPersonalMessage('');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setEmail('');
      setAppRole('');
      setWorkspaceRole('member');
      setPersonalMessage('');
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new team member to your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* App Role */}
            <div className="space-y-2">
              <Label htmlFor="app-role">Application Role *</Label>
              <Select value={appRole} onValueChange={(v) => setAppRole(v as AppRole)}>
                <SelectTrigger id="app-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines what features and actions the user can access.
              </p>
            </div>

            {/* Workspace Role */}
            <div className="space-y-2">
              <Label htmlFor="workspace-role">Workspace Role</Label>
              <Select value={workspaceRole} onValueChange={(v) => setWorkspaceRole(v as WorkspaceRole)}>
                <SelectTrigger id="workspace-role">
                  <SelectValue placeholder="Select workspace access" />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_ROLES.filter((r) => r.value !== 'owner').map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls workspace-level permissions like user management.
              </p>
            </div>

            {/* Personal Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to your invitation..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email || !appRole || inviteUser.isPending}>
              {inviteUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
