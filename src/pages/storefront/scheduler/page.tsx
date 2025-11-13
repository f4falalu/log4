/**
 * =====================================================
 * Scheduler - The Planning Cockpit (Main Page)
 * =====================================================
 * MVP Implementation: Manual Scheduling Flow
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchedulerBatches } from '@/hooks/useSchedulerBatches';
import { useRealtimeScheduler } from '@/hooks/useRealtimeScheduler';
import { SchedulerLayout } from './components/SchedulerLayout';
import { SchedulerControlBar } from './components/SchedulerControlBar';
import { StatusTabs } from './components/StatusTabs';
import { SchedulerListView } from './components/SchedulerListView';
import { SchedulePreviewPanel } from './components/SchedulePreviewPanel';
import { SummaryStrip } from './components/SummaryStrip';
import { ScheduleWizardDialog } from './components/ScheduleWizardDialog';
import type { SchedulerFilters, SchedulerBatchStatus } from '@/types/scheduler';

export default function SchedulerPage() {
  const [activeStatus, setActiveStatus] = useState<SchedulerBatchStatus>('ready');
  const [filters, setFilters] = useState<SchedulerFilters>({});
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Fetch batches with filters
  const { data: batches = [], isLoading } = useSchedulerBatches({
    filters: {
      ...filters,
      status: [activeStatus],
    },
  });

  // Subscribe to real-time updates
  useRealtimeScheduler({
    showToasts: true,
  });

  return (
    <SchedulerLayout>
      {/* Top Control Bar */}
      <SchedulerControlBar
        filters={filters}
        onFiltersChange={setFilters}
        onNewSchedule={() => setWizardOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Status Tabs */}
        <StatusTabs
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
        />

        {/* Center: Workspace (List View) */}
        <SchedulerListView
          batches={batches}
          isLoading={isLoading}
          selectedBatchId={selectedBatchId}
          onBatchSelect={setSelectedBatchId}
        />

        {/* Right: Preview Drawer */}
        {selectedBatchId && (
          <SchedulePreviewPanel
            batchId={selectedBatchId}
            onClose={() => setSelectedBatchId(null)}
          />
        )}
      </div>

      {/* Bottom: Summary Bar */}
      <SummaryStrip batches={batches} />

      {/* Schedule Assistant Wizard */}
      <ScheduleWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />
    </SchedulerLayout>
  );
}
