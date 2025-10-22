import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WorkspaceSwitcher() {
  const { workspace, setWorkspace, isDarkMode } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitch = (newWorkspace: 'fleetops' | 'storefront') => {
    setWorkspace(newWorkspace);
    navigate(newWorkspace === 'fleetops' ? '/fleetops' : '/storefront');
  };

  // Don't show switcher on auth pages
  if (location.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <div className={cn(
      "flex gap-1 p-1 rounded-biko-md transition-all duration-fast",
      "bg-card border border-biko-border shadow-biko-sm"
    )}>
      <Button
        variant={workspace === 'fleetops' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleSwitch('fleetops')}
        className={cn(
          "gap-2 text-operational transition-all duration-fast",
          "hover:bg-biko-highlight",
          workspace === 'fleetops' && [
            "bg-biko-primary text-white shadow-biko-sm",
            "hover:bg-biko-accent"
          ]
        )}
      >
        <Truck className="w-4 h-4" />
        <span className="font-medium">FleetOps</span>
      </Button>
      <Button
        variant={workspace === 'storefront' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleSwitch('storefront')}
        className={cn(
          "gap-2 text-operational transition-all duration-fast",
          "hover:bg-biko-highlight",
          workspace === 'storefront' && [
            "bg-biko-primary text-white shadow-biko-sm",
            "hover:bg-biko-accent"
          ]
        )}
      >
        <Warehouse className="w-4 h-4" />
        <span className="font-medium">Storefront</span>
      </Button>
    </div>
  );
}
