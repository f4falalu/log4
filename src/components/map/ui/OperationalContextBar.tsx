import { Button } from '@/components/ui/button';
import { useMapContext } from '@/hooks/useMapContext';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { 
  Truck, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Plus, 
  Download,
  Calendar,
  MapPin,
  Layers
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface OperationalContextBarProps {
  onOptimizeClick: () => void;
  onCreateBatchClick: () => void;
}

export function OperationalContextBar({
  onOptimizeClick,
  onCreateBatchClick,
}: OperationalContextBarProps) {
  const { mode, setMode } = useMapContext();
  const { data: stats } = useRealtimeStats();

  const modes: Array<{ value: typeof mode; label: string }> = [
    { value: 'live', label: 'Live' },
    { value: 'planning', label: 'Planning' },
    { value: 'playback', label: 'Playback' },
    { value: 'config', label: 'Config' },
  ];

  return (
    <div className="h-20 bg-background border-b border-border flex items-center justify-between px-6 gap-8">
      {/* Left: Mode Selector & Filters */}
      <div className="flex items-center gap-4">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {modes.map((m) => (
            <Button
              key={m.value}
              variant={mode === m.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode(m.value)}
              className={cn(
                'h-8 px-3 transition-all',
                mode === m.value && 'shadow-sm'
              )}
            >
              {m.label}
            </Button>
          ))}
        </div>

        {/* Date Filter */}
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Today
        </Button>

        {/* Zone Filter */}
        <Select defaultValue="all">
          <SelectTrigger className="h-9 w-[140px]">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="north">North Zone</SelectItem>
            <SelectItem value="south">South Zone</SelectItem>
            <SelectItem value="east">East Zone</SelectItem>
            <SelectItem value="west">West Zone</SelectItem>
          </SelectContent>
        </Select>

        {/* Fleet Filter */}
        <Select defaultValue="all">
          <SelectTrigger className="h-9 w-[140px]">
            <Layers className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Fleet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fleets</SelectItem>
            <SelectItem value="primary">Primary Fleet</SelectItem>
            <SelectItem value="backup">Backup Fleet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Center: Mission Stats */}
      <div className="flex items-center gap-8 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-base">{stats?.activeVehicles || 0}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </div>

        <div className="h-10 w-px bg-border" />

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10">
            <Package className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <div className="font-semibold text-base">{stats?.inProgressDeliveries || 0}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
        </div>

        <div className="h-10 w-px bg-border" />

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <div className="font-semibold text-base">{stats?.completedDeliveries || 0}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>

        <div className="h-10 w-px bg-border" />

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/10">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <div className="font-semibold text-base">{stats?.activeAlerts || 0}</div>
            <div className="text-xs text-muted-foreground">Alerts</div>
          </div>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onOptimizeClick} className="gap-2">
          <Zap className="h-4 w-4" />
          Optimize Routes
        </Button>

        <Button size="sm" variant="outline" onClick={onCreateBatchClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Batch
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Share Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
