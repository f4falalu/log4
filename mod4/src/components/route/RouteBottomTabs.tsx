import { motion } from 'framer-motion';
import { Navigation, List, Map, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteBottomTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const tabs = [
  { id: 'go', label: 'Go', icon: Navigation },
  { id: 'overview', label: 'Overview', icon: Map },
  { id: 'stops', label: 'Stops', icon: List },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export function RouteBottomTabs({
  activeTab = 'go',
  onTabChange,
}: RouteBottomTabsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around py-2 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors"
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
