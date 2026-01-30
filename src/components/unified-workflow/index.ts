/**
 * =====================================================
 * Unified Scheduler-Batch Workflow Components
 * =====================================================
 * Components for the unified 5-step workflow combining
 * Storefront scheduler and FleetOps batch creation.
 */

// Main Dialog
export { UnifiedWorkflowDialog } from './UnifiedWorkflowDialog';

// Steps
export { Step1Source } from './steps/Step1Source';
export { Step2Schedule } from './steps/Step2Schedule';
export { Step3Batch } from './steps/Step3Batch';
export { Step4Route } from './steps/Step4Route';
export { Step5Review } from './steps/Step5Review';

// Schedule Components (Step 2)
export { ThreeColumnLayout } from './schedule/ThreeColumnLayout';
export { ScheduleHeader } from './schedule/ScheduleHeader';
export { SourceOfTruthColumn } from './schedule/SourceOfTruthColumn';
export { WorkingSetColumn } from './schedule/WorkingSetColumn';
export { DecisionSupportColumn } from './schedule/DecisionSupportColumn';

// Batch Components (Step 3)
export { FacilityScheduleList } from './batch/FacilityScheduleList';
export { SlotGridColumn } from './batch/SlotGridColumn';
export { ScheduleDetailsColumn } from './batch/ScheduleDetailsColumn';
export { InteractiveSlotGrid } from './batch/InteractiveSlotGrid';
export { SlotCell } from './batch/SlotCell';
export { SlotAssignmentPopover } from './batch/SlotAssignmentPopover';

// Shared Components
export { MiniMapPreview } from './shared/MiniMapPreview';
export { RouteInsightsPanel } from './shared/RouteInsightsPanel';
export { VehicleSuggestionCard } from './shared/VehicleSuggestionCard';
