import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAbilityContext } from '@/rbac/AbilityProvider';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Settings, Users, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceModal } from '@/components/workspace/WorkspaceModal';

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { workspaceId, workspaceName, workspaces, switchWorkspace, archiveWorkspace } = useWorkspace();
  const { can, role, isLoading: abilityLoading } = useAbilityContext();
  const navigate = useNavigate();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email;
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const avatarSize = compact ? 'h-10 w-10' : 'h-10 w-10';
  const buttonSize = compact ? 'h-10 w-10' : 'h-10 w-10';

  const handleWorkspaceSwitch = () => {
    setShowWorkspaceModal(true);
  };

  const handlePermissions = () => {
    navigate('/settings/permissions');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleProfile = () => {
    navigate('/settings/profile');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn('relative rounded-full', buttonSize)}>
            <Avatar className={avatarSize}>
              <AvatarFallback className="bg-primary/10 text-xs">
                {getInitials(user.email || 'U')}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              {/* Identity Block */}
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
              
              {/* Workspace & Role Context */}
              {(workspaceName || role) && (
                <div className="flex flex-col space-y-1 pt-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Workspace:</span>
                    <span className="font-medium">{workspaceName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium">{role ? role.replace(/_/g, ' ') : 'Unknown'}</span>
                  </div>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Workspace Control */}
          <DropdownMenuItem onClick={handleWorkspaceSwitch}>
            <ArrowRight className="mr-2 h-4 w-4" />
            <span>Workspaces</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handlePermissions}>
            <Shield className="mr-2 h-4 w-4" />
            <span>My Permissions</span>
          </DropdownMenuItem>
          
          {/* Role-gated Workspace Settings — hidden (not disabled) if unauthorized */}
          {!abilityLoading && can('workspace.manage') && (
            <DropdownMenuItem onClick={handleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Workspace Settings</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Personal Actions */}
          <DropdownMenuItem onClick={handleProfile}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Workspace Switch Modal */}
      {showWorkspaceModal && (
        <WorkspaceModal
          onClose={() => setShowWorkspaceModal(false)}
          currentWorkspaceId={workspaceId}
          workspaces={workspaces}
          onSwitch={async (workspaceId) => {
            try {
              await switchWorkspace(workspaceId);
              setShowWorkspaceModal(false);
              toast.success('Workspace switched successfully');
            } catch (error) {
              // Error is already handled in switchWorkspace
              console.error('Workspace switch failed in UserMenu:', error);
            }
          }}
          onArchive={async (wsId) => {
            await archiveWorkspace(wsId);
          }}
        />
      )}
    </>
  );
}
