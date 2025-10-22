import { Outlet } from 'react-router-dom';
import { WorkspaceSwitcher } from '@/components/shared/WorkspaceSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FleetOpsLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
                  <Package className="h-4 w-4 text-background" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight">
                    FleetOps
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
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
