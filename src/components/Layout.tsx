import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { 
  MapPin, 
  Calendar, 
  Building, 
  BarChart3,
  Truck,
  Route,
  Package,
  User,
  FileText
} from 'lucide-react';
import { UserMenu } from './UserMenu';
import { NotificationCenter } from './NotificationCenter';
import { RoleSwitcher } from './RoleSwitcher';
import { usePermissions, Permission } from '@/hooks/usePermissions';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout = ({ children, activeTab, onTabChange }: LayoutProps) => {
  const { hasPermission } = usePermissions();

  // Define all possible tabs with their required permissions
  const allTabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3,
      permission: null
    },
    { 
      id: 'map', 
      label: 'Command Center', 
      icon: MapPin,
      permission: 'view_batches' as Permission
    },
    { 
      id: 'facilities', 
      label: 'Facilities', 
      icon: Building,
      permission: 'manage_facilities' as Permission
    },
    { 
      id: 'schedule', 
      label: 'Dispatch', 
      icon: Route,
      permission: 'assign_drivers' as Permission
    },
    { 
      id: 'batches', 
      label: 'Batches', 
      icon: Package,
      permission: 'view_batches' as Permission
    },
    { 
      id: 'drivers', 
      label: 'Drivers', 
      icon: User,
      permission: null // Temporarily removed for verification
    },
    { 
      id: 'vehicles', 
      label: 'Vehicles', 
      icon: Truck,
      permission: 'manage_vehicles' as Permission
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText,
      permission: 'view_reports' as Permission
    },
  ];

  // Filter tabs based on user permissions
  const tabs = allTabs.filter(tab => 
    !tab.permission || hasPermission(tab.permission)
  );

  return (
    <div className="min-h-screen bg-gradient-light">
      {/* Header */}
      <header className="bg-card border-b shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-medical rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PharmDispatch</h1>
                <p className="text-sm text-muted-foreground">Delivery Management Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RoleSwitcher />
              <NotificationCenter />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;