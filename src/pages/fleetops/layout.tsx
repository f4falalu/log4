import { Outlet } from 'react-router-dom';
import { WorkspaceSwitcher } from '@/components/shared/WorkspaceSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { Package } from 'lucide-react';

export function FleetOpsLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-[2000px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none text-white">BIKO FleetOps</span>
                <span className="text-xs text-slate-400">Operations & Delivery</span>
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
