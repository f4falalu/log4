import { useState } from 'react';
import { ScheduleHeader } from './components/ScheduleHeader';
import { FiltersSidebar } from './components/FiltersSidebar';
import { ScheduleList } from './components/ScheduleList';
import { InsightsSidebar } from './components/InsightsSidebar';
import { CreateScheduleDialog } from './components/CreateScheduleDialog';
import { ScheduleAssistantDialog } from './components/ScheduleAssistant/ScheduleAssistantDialog';
import { useRealtimeSchedules } from '@/hooks/useRealtimeSchedules';
import { OptimizeDialog } from './components/OptimizeDialog';
import { SendToFleetOpsDialog } from './components/SendToFleetOpsDialog';
import { ExportDialog } from './components/ExportDialog';
import { useDeliverySchedules, DeliverySchedule } from '@/hooks/useDeliverySchedules';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function SchedulePlanner() {
  // Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [sortBy, setSortBy] = useState('earliest');
  const [timeWindows, setTimeWindows] = useState<string[]>([]);
  const [payloadRange, setPayloadRange] = useState<[number, number]>([0, 5000]);
  const [statuses, setStatuses] = useState<string[]>([]);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);

  // Real-time updates
  useRealtimeSchedules();
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [sendToFleetOpsDialogOpen, setSendToFleetOpsDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<DeliverySchedule | null>(null);

  // Data Hooks
  const { data: warehouses = [] } = useWarehouses();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return { start: selectedDate, end: selectedDate };
      case 'week':
        return { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) };
      case 'month':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
    }
  };

  const { data: schedules = [], isLoading } = useDeliverySchedules({
    warehouseId: selectedWarehouse || undefined,
    dateRange: getDateRange(),
    status: statuses.length > 0 ? statuses[0] : undefined
  });

  // Filter schedules based on active filters
  const filteredSchedules = schedules.filter(schedule => {
    // Time window filter
    if (timeWindows.length > 0 && !timeWindows.includes(schedule.time_window)) {
      return false;
    }

    // Payload range filter
    if (schedule.total_payload_kg < payloadRange[0] || schedule.total_payload_kg > payloadRange[1]) {
      return false;
    }

    // Status filter
    if (statuses.length > 0 && !statuses.includes(schedule.status)) {
      return false;
    }

    return true;
  });

  // Sort schedules
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    switch (sortBy) {
      case 'earliest':
        return new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime();
      case 'latest':
        return new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime();
      case 'highest-payload':
        return b.total_payload_kg - a.total_payload_kg;
      case 'shortest-route':
        return a.facility_ids.length - b.facility_ids.length;
      default:
        return 0;
    }
  });

  const handleTimeWindowToggle = (window: string) => {
    setTimeWindows(prev =>
      prev.includes(window) ? prev.filter(w => w !== window) : [...prev, window]
    );
  };

  const handleStatusToggle = (status: string) => {
    setStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleResetFilters = () => {
    setSortBy('earliest');
    setTimeWindows([]);
    setPayloadRange([0, 5000]);
    setStatuses([]);
  };

  const handleViewRoute = (schedule: DeliverySchedule) => {
    // Could open a map view dialog
    console.log('View route for:', schedule.title);
  };

  const handleOptimize = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setOptimizeDialogOpen(true);
  };

  const handleExport = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setExportDialogOpen(true);
  };

  const handleSendToFleetOps = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setSendToFleetOpsDialogOpen(true);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Filters */}
      <FiltersSidebar
        sortBy={sortBy}
        onSortChange={setSortBy}
        timeWindows={timeWindows}
        onTimeWindowToggle={handleTimeWindowToggle}
        payloadRange={payloadRange}
        onPayloadRangeChange={setPayloadRange}
        statuses={statuses}
        onStatusToggle={handleStatusToggle}
        onReset={handleResetFilters}
        onApply={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ScheduleHeader
          selectedWarehouse={selectedWarehouse}
          onWarehouseChange={setSelectedWarehouse}
          selectedDate={selectedDate}
          onDateChange={(date) => date && setSelectedDate(date)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          warehouses={warehouses.map(w => ({ id: w.id, name: w.name }))}
          onSearch={() => {}}
          onCreateNew={() => setAssistantDialogOpen(true)}
        />

        {/* Schedule List */}
        <ScheduleList
          schedules={sortedSchedules}
          onViewRoute={handleViewRoute}
          onOptimize={handleOptimize}
          onExport={handleExport}
          onSendToFleetOps={handleSendToFleetOps}
          isLoading={isLoading}
        />
      </div>

      {/* Right Sidebar - Insights */}
      <InsightsSidebar schedules={schedules} />

      {/* Dialogs */}
      <ScheduleAssistantDialog
        open={assistantDialogOpen}
        onOpenChange={setAssistantDialogOpen}
      />

      <CreateScheduleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        warehouses={warehouses.map(w => ({ id: w.id, name: w.name }))}
        vehicles={vehicles.map(v => ({ id: v.id, model: v.model, plate_number: v.plateNumber }))}
        drivers={drivers.map(d => ({ id: d.id, name: d.name }))}
      />

      <OptimizeDialog
        open={optimizeDialogOpen}
        onOpenChange={setOptimizeDialogOpen}
        schedule={selectedSchedule}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        schedule={selectedSchedule}
      />

      <SendToFleetOpsDialog
        open={sendToFleetOpsDialogOpen}
        onOpenChange={setSendToFleetOpsDialogOpen}
        schedule={selectedSchedule}
      />
    </div>
  );
}
