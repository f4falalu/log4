// MOD4 App Shell
// Main layout wrapper for the PWA

import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SyncIndicator } from './SyncIndicator';
import { NotificationCenter } from './notifications';
import { useAuthStore } from '@/stores/authStore';
import { useBatchStore } from '@/stores/batchStore';
import { Menu, Package, MapPin, AlertCircle, User, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
interface AppShellProps {
  children: ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
  title?: string;
}

export function AppShell({ 
  children, 
  showHeader = true, 
  showNav = true,
  title 
}: AppShellProps) {
  const { driver } = useAuthStore();
  const { progress, completedSlots, totalSlots } = useBatchStore();

  return (
    <div className="min-h-screen flex flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Left: Menu or back */}
            <div className="flex items-center gap-3">
              <button className="touch-target flex items-center justify-center">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              {title && (
                <h1 className="font-semibold text-foreground">{title}</h1>
              )}
            </div>

            {/* Right: Notifications + Sync status */}
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <SyncIndicator />
            </div>
          </div>
          {/* Progress bar (when batch is active) */}
          {totalSlots > 0 && (
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{completedSlots} of {totalSlots} delivered</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-success rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      {showNav && driver && (
        <BottomNav />
      )}
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { icon: Package, label: 'Batch', path: '/dashboard' },
    { icon: MapPin, label: 'Route', path: '/route' },
    { icon: BarChart3, label: 'Stats', path: '/summary' },
    { icon: AlertCircle, label: 'Support', path: '/support' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="sticky bottom-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || 
            (path === '/dashboard' && location.pathname === '/');
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 touch-target relative",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
