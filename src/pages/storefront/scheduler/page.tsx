import { useEffect, useMemo, useState } from 'react';
import { useSchedulerBatches } from '@/hooks/useSchedulerBatches';
import { useRealtimeScheduler } from '@/hooks/useRealtimeScheduler';
import { useWarehouses } from '@/hooks/useWarehouses';
import { SchedulerLayout } from './components/SchedulerLayout';
import { UnifiedHeader, type StatusFilterExtras, type ViewMode } from './components/UnifiedHeader';
import { SchedulerListView } from './components/SchedulerListView';
import { SchedulePreviewPanel } from './components/SchedulePreviewPanel';
import { SummaryStrip } from './components/SummaryStrip';
import { UnifiedWorkflowDialog } from '@/components/unified-workflow';
import { CalendarView } from './components/CalendarView';
import type { SchedulerFilters } from '@/types/scheduler';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useFacilities } from '@/hooks/useFacilities.tsx';

export default function SchedulerPage() {
  // View state
  const [activeView, setActiveView] = useState<ViewMode>('status');
  
  // Status view state
  const [statusFilters, setStatusFilters] = useState<SchedulerFilters>({});
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  
  // Calendar view state
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month'>('week');
  
  // Common state
  const [wizardOpen, setWizardOpen] = useState(false);

  // Data hooks
  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.warehouses || [];
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: facilitiesData } = useFacilities();
  const facilities = facilitiesData?.facilities ?? [];
  
  // Fetch batches with filters - only for status view
  const { data: batches = [], isLoading } = useSchedulerBatches({
    filters: statusFilters,
  });

  const [statusExtras, setStatusExtras] = useState<StatusFilterExtras>({
    assignment: 'any',
    program: 'all',
    zone: 'all',
  });

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      if (statusExtras.assignment === 'assigned' && !batch.driver_id) return false;
      if (statusExtras.assignment === 'unassigned' && batch.driver_id) return false;

      if (statusExtras.zone && statusExtras.zone !== 'all') {
        if (!batch.zone || batch.zone !== statusExtras.zone) {
          return false;
        }
      }

      const payload = batch.total_weight_kg ?? 0;
      if (statusExtras.payloadMin !== undefined && payload < statusExtras.payloadMin) {
        return false;
      }
      if (statusExtras.payloadMax !== undefined && payload > statusExtras.payloadMax) {
        return false;
      }

      if (statusExtras.program !== 'all') {
        const programs = batch.tags || [];
        if (!programs.includes(statusExtras.program)) {
          return false;
        }
      }

      return true;
    });
  }, [batches, statusExtras]);

  useEffect(() => {
    if (selectedBatchId && !filteredBatches.some((batch) => batch.id === selectedBatchId)) {
      setSelectedBatchId(null);
    }
  }, [filteredBatches, selectedBatchId]);

  const availablePrograms = useMemo(() => {
    const programSet = new Set<string>();
    batches.forEach((batch) => {
      batch.tags?.forEach((tag) => {
        if (tag) {
          programSet.add(tag);
        }
      });
    });
    return Array.from(programSet).sort();
  }, [batches]);

  const availableZones = useMemo(() => {
    const zoneSet = new Set<string>();
    batches.forEach((batch) => {
      if (batch.zone) {
        zoneSet.add(batch.zone);
      }
    });
    return Array.from(zoneSet).sort();
  }, [batches]);

  // Subscribe to real-time updates
  useRealtimeScheduler({
    showToasts: true,
  });

  const handleScheduleClick = (schedule: any) => {
    setSelectedBatchId(schedule.id);
  };

  const header = (
    <UnifiedHeader
      activeView={activeView}
      onViewChange={setActiveView}
      statusFilters={statusFilters}
      onStatusFiltersChange={setStatusFilters}
      statusExtras={statusExtras}
      onStatusExtrasChange={setStatusExtras}
      selectedWarehouse={selectedWarehouse}
      onWarehouseChange={setSelectedWarehouse}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      calendarViewMode={calendarViewMode}
      onCalendarViewModeChange={setCalendarViewMode}
      warehouses={Array.isArray(warehouses) ? warehouses.map((w) => ({ id: w.id, name: w.name })) : []}
      availablePrograms={availablePrograms}
      availableZones={availableZones}
      onNewSchedule={() => setWizardOpen(true)}
    />
  );

  const content = activeView === 'status' ? (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0">
        <SchedulerListView
          batches={filteredBatches}
          isLoading={isLoading}
          selectedBatchId={selectedBatchId}
          onBatchSelect={setSelectedBatchId}
          warehouses={warehouses}
          drivers={drivers}
          vehicles={vehicles}
          facilities={facilities}
        />
      </div>
      {selectedBatchId && (
        <SchedulePreviewPanel
          batchId={selectedBatchId}
          onClose={() => setSelectedBatchId(null)}
        />
      )}
    </div>
  ) : (
    <CalendarView
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      viewMode={calendarViewMode}
      onViewModeChange={setCalendarViewMode}
      schedules={batches}
      onScheduleClick={handleScheduleClick}
    />
  );

  const summary = activeView === 'status' ? (
    <SummaryStrip batches={filteredBatches} />
  ) : (
    <div className="px-6 py-4 text-sm text-muted-foreground">Summary unavailable in calendar view.</div>
  );

  return (
    <SchedulerLayout header={header} content={content} summary={summary}>
      <UnifiedWorkflowDialog open={wizardOpen} onOpenChange={setWizardOpen} startStep={1} />
    </SchedulerLayout>
  );
}
