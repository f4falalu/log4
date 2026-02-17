/**
 * =====================================================
 * Step 2: Schedule Phase
 * =====================================================
 * 3-column layout for building the schedule:
 * - Left: Source of Truth (available facilities)
 * - Middle: Working Set (selected facilities)
 * - Right: Decision Support (map, insights, AI options)
 */

import * as React from 'react';
import { ThreeColumnLayout, LeftColumn, MiddleColumn, RightColumn } from '../schedule/ThreeColumnLayout';
import { ScheduleHeader } from '../schedule/ScheduleHeader';
import { SourceOfTruthColumn, type FacilityCandidate } from '../schedule/SourceOfTruthColumn';
import { WorkingSetColumn } from '../schedule/WorkingSetColumn';
import { DecisionSupportColumn } from '../schedule/DecisionSupportColumn';
import type {
  WorkingSetItem,
  AiOptimizationOptions,
  SourceSubOption,
} from '@/types/unified-workflow';
import type { TimeWindow } from '@/types/scheduler';

interface Step2ScheduleProps {
  // Header props
  title: string | null;
  onTitleChange: (title: string) => void;
  startLocationId: string | null;
  startLocationType: 'warehouse' | 'facility';
  onStartLocationChange: (id: string, type: 'warehouse' | 'facility') => void;
  plannedDate: string | null;
  onPlannedDateChange: (date: string) => void;
  timeWindow: TimeWindow | null;
  onTimeWindowChange: (window: TimeWindow | null) => void;

  // Data
  warehouses: Array<{ id: string; name: string; lat?: number; lng?: number }>;
  facilities?: Array<{ id: string; name: string }>;
  candidates: FacilityCandidate[];
  candidatesLoading?: boolean;

  // Working set props
  workingSet: WorkingSetItem[];
  onAddToWorkingSet: (item: WorkingSetItem) => void;
  onRemoveFromWorkingSet: (facilityId: string) => void;
  onReorderWorkingSet: (fromIndex: number, toIndex: number) => void;
  onClearWorkingSet: () => void;

  // AI options
  sourceSubOption: SourceSubOption | null;
  aiOptions: AiOptimizationOptions;
  onAiOptionsChange: (options: Partial<AiOptimizationOptions>) => void;

  // Vehicle suggestion
  suggestedVehicleId: string | null;
  onSuggestedVehicleChange: (vehicleId: string | null) => void;
}

export function Step2Schedule({
  title,
  onTitleChange,
  startLocationId,
  startLocationType,
  onStartLocationChange,
  plannedDate,
  onPlannedDateChange,
  timeWindow,
  onTimeWindowChange,
  warehouses,
  facilities = [],
  candidates,
  candidatesLoading = false,
  workingSet,
  onAddToWorkingSet,
  onRemoveFromWorkingSet,
  onReorderWorkingSet,
  onClearWorkingSet,
  sourceSubOption,
  aiOptions,
  onAiOptionsChange,
  suggestedVehicleId,
  onSuggestedVehicleChange,
}: Step2ScheduleProps) {
  // Get selected facility IDs for the left column
  const selectedFacilityIds = React.useMemo(
    () => workingSet.map((item) => item.facility_id),
    [workingSet]
  );

  // Get start location details for the right column
  const startLocation = React.useMemo(() => {
    if (!startLocationId) return null;
    const warehouse = warehouses.find((w) => w.id === startLocationId);
    if (warehouse) {
      return { id: warehouse.id, name: warehouse.name, lat: warehouse.lat, lng: warehouse.lng };
    }
    const facility = facilities.find((f) => f.id === startLocationId);
    if (facility) {
      return { id: facility.id, name: facility.name };
    }
    return null;
  }, [startLocationId, warehouses, facilities]);

  return (
    <div className="flex flex-col min-h-[65vh]">
      {/* Schedule Header */}
      <ScheduleHeader
        title={title}
        onTitleChange={onTitleChange}
        startLocationId={startLocationId}
        startLocationType={startLocationType}
        onStartLocationChange={onStartLocationChange}
        plannedDate={plannedDate}
        onPlannedDateChange={onPlannedDateChange}
        timeWindow={timeWindow}
        onTimeWindowChange={onTimeWindowChange}
        warehouses={warehouses}
        facilities={facilities}
      />

      {/* 3-Column Layout */}
      <div className="flex-1 min-h-0 p-4">
        <ThreeColumnLayout className="h-full">
          {/* Left Column: Source of Truth */}
          <LeftColumn
            title="Available Facility Orders"
            subtitle="Ready consignments from finalized requisitions"
          >
            <SourceOfTruthColumn
              candidates={candidates}
              selectedIds={selectedFacilityIds}
              onAddToWorkingSet={onAddToWorkingSet}
              isLoading={candidatesLoading}
            />
          </LeftColumn>

          {/* Middle Column: Working Set */}
          <MiddleColumn
            title="Selected Facilities"
            subtitle="Batch-in-formation • Drag to reorder"
          >
            <WorkingSetColumn
              items={workingSet}
              onReorder={onReorderWorkingSet}
              onRemove={onRemoveFromWorkingSet}
              onClear={onClearWorkingSet}
            />
          </MiddleColumn>

          {/* Right Column: Decision Support */}
          <RightColumn title="Decision Support">
            <DecisionSupportColumn
              workingSet={workingSet}
              startLocation={startLocation}
              sourceSubOption={sourceSubOption}
              aiOptions={aiOptions}
              onAiOptionsChange={onAiOptionsChange}
              suggestedVehicleId={suggestedVehicleId}
              onSuggestedVehicleChange={onSuggestedVehicleChange}
            />
          </RightColumn>
        </ThreeColumnLayout>
      </div>
    </div>
  );
}

export default Step2Schedule;
