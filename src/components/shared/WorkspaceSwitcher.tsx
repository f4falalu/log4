import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Warehouse, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = useWorkspace();
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
    <div className="flex gap-1 bg-muted p-1 rounded-lg">
      <Button
        variant={workspace === 'fleetops' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleSwitch('fleetops')}
        className="gap-2"
      >
        <Truck className="w-4 h-4" />
        FleetOps
      </Button>
      <Button
        variant={workspace === 'storefront' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleSwitch('storefront')}
        className="gap-2"
      >
        <Warehouse className="w-4 h-4" />
        Storefront
      </Button>
    </div>
  );
}
