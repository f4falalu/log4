import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, Truck, Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function WorkspaceSwitcher() {
  const {
    workspace,
    setWorkspace,
    workspaceId,
    workspaceName,
    role,
    workspaces,
    switchWorkspace,
  } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const handleModuleSwitch = (newWorkspace: 'fleetops' | 'storefront') => {
    setWorkspace(newWorkspace);
    navigate(newWorkspace === 'fleetops' ? '/fleetops' : '/storefront');
  };

  // Don't show switcher on auth pages
  if (location.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Tenant Workspace Selector */}
      {workspaces.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 max-w-[180px]">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{workspaceName || 'Select workspace'}</span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.workspace_id}
                onClick={() => switchWorkspace(ws.workspace_id)}
                className="flex items-center justify-between"
              >
                <span>{ws.name}</span>
                {ws.workspace_id === workspaceId && (
                  <Badge variant="secondary" className="text-xs ml-2">Active</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Single workspace — just show the name */}
      {workspaces.length === 1 && workspaceName && (
        <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[140px]">{workspaceName}</span>
        </div>
      )}

      {/* Module Switcher (FleetOps / Storefront) */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        <Button
          variant={workspace === 'fleetops' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleModuleSwitch('fleetops')}
          className="gap-2"
        >
          <Truck className="w-4 h-4" />
          FleetOps
        </Button>
        <Button
          variant={workspace === 'storefront' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleModuleSwitch('storefront')}
          className="gap-2"
        >
          <Warehouse className="w-4 h-4" />
          Storefront
        </Button>
      </div>
    </div>
  );
}
