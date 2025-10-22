import { Outlet } from 'react-router-dom';
import { WorkspaceSwitcher } from '@/components/shared/WorkspaceSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className={cn(
        "bg-card border-b border-border/50",
        "shadow-sm backdrop-blur-sm",
        "sticky top-0 z-50"
      )}>
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
                <Warehouse className="h-4 w-4 text-background" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Storefront
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Warehouse & Inventory
                </span>
              </div>
            </div>
            <WorkspaceSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-56px)] overflow-hidden bg-background">
        <Outlet />
      </main>
    </div>
  );
}
