import { Outlet } from 'react-router-dom';
import { WorkspaceSwitcher } from '@/components/shared/WorkspaceSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { Warehouse } from 'lucide-react';

export function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-[2000px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none">BIKO Storefront</span>
                <span className="text-xs text-muted-foreground">Warehouse & Inventory</span>
              </div>
            </div>
            <WorkspaceSwitcher />
          </div>
          <div className="flex gap-2">
            <NotificationCenter />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  );
}
