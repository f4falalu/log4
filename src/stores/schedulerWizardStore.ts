/**
 * =====================================================
 * Scheduler Wizard State Management (Zustand Store)
 * =====================================================
 * Manages multi-step wizard state for Schedule Assistant
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  WizardStep,
  WizardState,
  BatchAssignment,
  OptimizationParams,
  OptimizedBatch,
  UploadedDispatchData,
  TimeWindow,
} from '@/types/scheduler';

interface WizardActions {
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: WizardStep) => void;
  resetWizard: () => void;

  // Step 1: Source selection
  setSourceMethod: (method: 'ready' | 'upload' | 'manual') => void;

  // Step 2: Mode selection
  setSchedulingMode: (mode: 'manual' | 'ai') => void;

  // Step 3: Schedule metadata
  setScheduleTitle: (title: string) => void;
  setWarehouseId: (id: string) => void;
  setPlannedDate: (date: string) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setVehicleId: (id: string | null) => void;
  setDriverId: (id: string | null) => void;
  setNotes: (notes: string) => void;

  // Step 3A: Manual selection
  setSelectedFacilities: (facilityIds: string[]) => void;
  addFacility: (facilityId: string) => void;
  removeFacility: (facilityId: string) => void;
  clearFacilities: () => void;

  // Step 3B: File upload
  setUploadedFile: (file: File | null) => void;
  setFileData: (data: UploadedDispatchData | null) => void;

  // Step 3C: Optimization
  setOptimizationParams: (params: OptimizationParams | null) => void;
  setOptimizationResults: (results: OptimizedBatch[] | null) => void;

  // Batch creation & assignment
  addBatch: (batch: BatchAssignment) => void;
  updateBatch: (batchId: string, updates: Partial<BatchAssignment>) => void;
  removeBatch: (batchId: string) => void;
  clearBatches: () => void;

  // Getters
  canProceedToNextStep: () => boolean;
  getTotalFacilities: () => number;
  getTotalBatches: () => number;
}

type WizardStore = WizardState & WizardActions;

const initialState: WizardState = {
  current_step: 1,
  source_method: null,
  scheduling_mode: null,
  schedule_title: null,
  warehouse_id: null,
  planned_date: null,
  time_window: null,
  vehicle_id: null,
  driver_id: null,
  notes: null,
  selected_facilities: [],
  uploaded_file: null,
  file_data: null,
  created_batches: [],
  optimization_params: null,
  optimization_results: null,
};

export const useSchedulerWizardStore = create<WizardStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // =====================================================
        // NAVIGATION ACTIONS
        // =====================================================

        nextStep: () => {
          const { current_step, canProceedToNextStep } = get();
          if (canProceedToNextStep() && current_step < 4) {
            set({ current_step: (current_step + 1) as WizardStep }, false, 'wizard/nextStep');
          }
        },

        previousStep: () => {
          const { current_step } = get();
          if (current_step > 1) {
            set({ current_step: (current_step - 1) as WizardStep }, false, 'wizard/previousStep');
          }
        },

        goToStep: (step: WizardStep) => {
          set({ current_step: step }, false, 'wizard/goToStep');
        },

        resetWizard: () => {
          set({ ...initialState }, false, 'wizard/reset');
        },

        // =====================================================
        // STEP 1: SOURCE SELECTION
        // =====================================================

        setSourceMethod: (method) => {
          set({ source_method: method }, false, 'wizard/setSourceMethod');
        },

        // =====================================================
        // STEP 2: MODE SELECTION
        // =====================================================

        setSchedulingMode: (mode) => {
          set({ scheduling_mode: mode }, false, 'wizard/setSchedulingMode');
        },

        // =====================================================
        // STEP 3: SCHEDULE METADATA
        // =====================================================

        setScheduleTitle: (title) => {
          set({ schedule_title: title }, false, 'wizard/setScheduleTitle');
        },

        setWarehouseId: (id) => {
          set({ warehouse_id: id }, false, 'wizard/setWarehouseId');
        },

        setPlannedDate: (date) => {
          set({ planned_date: date }, false, 'wizard/setPlannedDate');
        },

        setTimeWindow: (window) => {
          set({ time_window: window }, false, 'wizard/setTimeWindow');
        },

        setVehicleId: (id) => {
          set({ vehicle_id: id }, false, 'wizard/setVehicleId');
        },

        setDriverId: (id) => {
          set({ driver_id: id }, false, 'wizard/setDriverId');
        },

        setNotes: (notes) => {
          set({ notes }, false, 'wizard/setNotes');
        },

        // =====================================================
        // STEP 3A: MANUAL FACILITY SELECTION
        // =====================================================

        setSelectedFacilities: (facilityIds) => {
          set({ selected_facilities: facilityIds }, false, 'wizard/setSelectedFacilities');
        },

        addFacility: (facilityId) => {
          const { selected_facilities } = get();
          if (!selected_facilities.includes(facilityId)) {
            set(
              { selected_facilities: [...selected_facilities, facilityId] },
              false,
              'wizard/addFacility'
            );
          }
        },

        removeFacility: (facilityId) => {
          const { selected_facilities } = get();
          set(
            { selected_facilities: selected_facilities.filter((id) => id !== facilityId) },
            false,
            'wizard/removeFacility'
          );
        },

        clearFacilities: () => {
          set({ selected_facilities: [] }, false, 'wizard/clearFacilities');
        },

        // =====================================================
        // STEP 3B: FILE UPLOAD
        // =====================================================

        setUploadedFile: (file) => {
          set({ uploaded_file: file }, false, 'wizard/setUploadedFile');
        },

        setFileData: (data) => {
          set({ file_data: data }, false, 'wizard/setFileData');
        },

        // =====================================================
        // STEP 3C: OPTIMIZATION
        // =====================================================

        setOptimizationParams: (params) => {
          set({ optimization_params: params }, false, 'wizard/setOptimizationParams');
        },

        setOptimizationResults: (results) => {
          set({ optimization_results: results }, false, 'wizard/setOptimizationResults');
        },

        // =====================================================
        // BATCH MANAGEMENT
        // =====================================================

        addBatch: (batch) => {
          const { created_batches } = get();
          set(
            { created_batches: [...created_batches, batch] },
            false,
            'wizard/addBatch'
          );
        },

        updateBatch: (batchId, updates) => {
          const { created_batches } = get();
          set(
            {
              created_batches: created_batches.map((batch) =>
                batch.id === batchId ? { ...batch, ...updates } : batch
              ),
            },
            false,
            'wizard/updateBatch'
          );
        },

        removeBatch: (batchId) => {
          const { created_batches } = get();
          set(
            { created_batches: created_batches.filter((batch) => batch.id !== batchId) },
            false,
            'wizard/removeBatch'
          );
        },

        clearBatches: () => {
          set({ created_batches: [] }, false, 'wizard/clearBatches');
        },

        // =====================================================
        // VALIDATION & GETTERS
        // =====================================================

        canProceedToNextStep: () => {
          const {
            current_step,
            source_method,
            scheduling_mode,
            schedule_title,
            warehouse_id,
            planned_date,
            selected_facilities,
            file_data,
            created_batches,
            optimization_results,
          } = get();

          switch (current_step) {
            case 1:
              // Step 1: Source method must be selected
              return source_method !== null;

            case 2:
              // Step 2: Scheduling mode must be selected
              return scheduling_mode !== null;

            case 3:
              // Step 3: Must have schedule metadata + facilities
              const hasMetadata =
                schedule_title !== null && schedule_title.trim() !== '' &&
                warehouse_id !== null &&
                planned_date !== null &&
                selected_facilities.length > 0;

              if (scheduling_mode === 'manual') {
                // Manual mode: must have schedule metadata + facilities
                return hasMetadata;
              } else if (scheduling_mode === 'ai_optimized') {
                // AI mode: must have metadata + optimization results
                return hasMetadata && optimization_results !== null && optimization_results.length > 0;
              }
              // Upload mode: must have valid file data
              if (source_method === 'upload') {
                return file_data !== null && file_data.error_count === 0;
              }
              return false;

            case 4:
              // Step 4: Final review, always can proceed (to submit)
              return schedule_title !== null && selected_facilities.length > 0;

            default:
              return false;
          }
        },

        getTotalFacilities: () => {
          const { selected_facilities, file_data, created_batches } = get();

          // Count unique facilities from all sources
          const allFacilities = new Set<string>();

          // From manual selection
          selected_facilities.forEach((id) => allFacilities.add(id));

          // From uploaded file
          if (file_data) {
            file_data.rows
              .filter((row) => row.is_valid)
              .forEach((row) => allFacilities.add(row.facility_id));
          }

          // From created batches
          created_batches.forEach((batch) => {
            batch.facility_ids.forEach((id) => allFacilities.add(id));
          });

          return allFacilities.size;
        },

        getTotalBatches: () => {
          const { created_batches } = get();
          return created_batches.length;
        },
      }),
      {
        name: 'scheduler-wizard-storage',
        // Only persist non-file data
        partialize: (state) => ({
          current_step: state.current_step,
          source_method: state.source_method,
          scheduling_mode: state.scheduling_mode,
          schedule_title: state.schedule_title,
          warehouse_id: state.warehouse_id,
          planned_date: state.planned_date,
          time_window: state.time_window,
          vehicle_id: state.vehicle_id,
          driver_id: state.driver_id,
          notes: state.notes,
          selected_facilities: state.selected_facilities,
          created_batches: state.created_batches,
          optimization_params: state.optimization_params,
        }),
      }
    ),
    { name: 'SchedulerWizard' }
  )
);

// =====================================================
// SELECTOR HOOKS
// =====================================================

/**
 * Get current step
 */
export const useCurrentStep = () =>
  useSchedulerWizardStore((state) => state.current_step);

/**
 * Get source method
 */
export const useSourceMethod = () =>
  useSchedulerWizardStore((state) => state.source_method);

/**
 * Get scheduling mode
 */
export const useSchedulingMode = () =>
  useSchedulerWizardStore((state) => state.scheduling_mode);

/**
 * Get selected facilities
 */
export const useSelectedFacilities = () =>
  useSchedulerWizardStore((state) => state.selected_facilities);

/**
 * Get created batches
 */
export const useCreatedBatches = () =>
  useSchedulerWizardStore((state) => state.created_batches);

/**
 * Check if can proceed to next step
 */
export const useCanProceed = () =>
  useSchedulerWizardStore((state) => state.canProceedToNextStep());

/**
 * Get wizard actions
 */
export const useWizardActions = () =>
  useSchedulerWizardStore((state) => ({
    nextStep: state.nextStep,
    previousStep: state.previousStep,
    goToStep: state.goToStep,
    resetWizard: state.resetWizard,
    setSourceMethod: state.setSourceMethod,
    setSchedulingMode: state.setSchedulingMode,
    setScheduleTitle: state.setScheduleTitle,
    setWarehouseId: state.setWarehouseId,
    setPlannedDate: state.setPlannedDate,
    setTimeWindow: state.setTimeWindow,
    setVehicleId: state.setVehicleId,
    setDriverId: state.setDriverId,
    setNotes: state.setNotes,
    setSelectedFacilities: state.setSelectedFacilities,
    addFacility: state.addFacility,
    removeFacility: state.removeFacility,
    addBatch: state.addBatch,
    updateBatch: state.updateBatch,
    removeBatch: state.removeBatch,
    setOptimizationParams: state.setOptimizationParams,
    setOptimizationResults: state.setOptimizationResults,
  }));
