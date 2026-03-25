import { useState } from 'react';
import { Search, Users, Plus, Check, Archive, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import type { TenantWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceModalProps {
  onClose: () => void;
  currentWorkspaceId: string | null;
  workspaces: TenantWorkspace[];
  onSwitch: (workspaceId: string) => Promise<void>;
  onArchive: (workspaceId: string) => Promise<void>;
}

export function WorkspaceModal({
  onClose,
  currentWorkspaceId,
  workspaces,
  onSwitch,
  onArchive,
}: WorkspaceModalProps) {
  const [search, setSearch] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<TenantWorkspace | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) return;
    if (isSwitching) return;

    setIsSwitching(true);
    try {
      await onSwitch(workspaceId);
      onClose();
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await onArchive(archiveTarget.workspace_id);
      setArchiveTarget(null);
    } catch {
      // Error toast handled by context
    } finally {
      setIsArchiving(false);
    }
  };

  const isOwnerOrAdmin = (role: string) => role === 'owner' || role === 'admin';

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Workspace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Workspace List */}
          <ScrollArea className="h-[300px] w-full rounded-md border">
            <div className="p-2 space-y-1">
              {filteredWorkspaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? 'No workspaces found matching your search.' : 'No workspaces available.'}
                </div>
              ) : (
                filteredWorkspaces.map((workspace) => {
                  const isCurrent = workspace.workspace_id === currentWorkspaceId;
                  const isOwner = workspace.role_code === 'owner';
                  const canArchive = isOwnerOrAdmin(workspace.role_code);
                  return (
                    <div
                      key={workspace.workspace_id}
                      onClick={() => handleSwitch(workspace.workspace_id)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        isCurrent && 'bg-primary/10 border-primary/20',
                        isSwitching && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            <h3 className="font-medium truncate">{workspace.name}</h3>
                            {isCurrent && (
                              <div className="flex items-center gap-1 text-xs text-primary">
                                <Check className="h-3 w-3" />
                                <span>Current</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Role: {formatRole(workspace.role_code)}
                          </p>
                        </div>
                        {canArchive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setArchiveTarget(workspace);
                            }}
                            title="Archive workspace"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} available
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </Button>
          </div>
        </div>
      </DialogContent>

      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) onClose();
        }}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{archiveTarget?.name}</strong>?
              This workspace will be hidden from the workspace list and members will no longer
              be able to access it. This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? 'Archiving...' : 'Archive Workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
