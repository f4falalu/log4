import { useState } from 'react';
import { DeliverySchedule } from './useDeliverySchedules';

export type ScheduleSource = 'manual' | 'upload' | 'ready_for_dispatch';
export type ScheduleMode = 'manual' | 'ai_optimized';

export interface BatchData {
  id: string;
  name: string;
  facilityIds: string[];
  driverId?: string;
  vehicleId?: string;
  estimatedDistance?: number;
  estimatedDuration?: number;
  capacityUsedPct?: number;
  routeData?: any;
}

export interface WizardState {
  step: number;
  source: ScheduleSource | null;
  mode: ScheduleMode | null;
  selectedFacilities: string[];
  batches: BatchData[];
  optimizationParams: {
    capacityThreshold: number;
    timeWindows: 'strict' | 'flexible';
    priorityWeights: {
      distance: 'high' | 'medium' | 'low';
      duration: 'high' | 'medium' | 'low';
      cost: 'high' | 'medium' | 'low';
    };
  };
  uploadedFile?: File;
  parsedData?: any;
}

export function useScheduleWizard() {
  const [state, setState] = useState<WizardState>({
    step: 1,
    source: null,
    mode: null,
    selectedFacilities: [],
    batches: [],
    optimizationParams: {
      capacityThreshold: 80,
      timeWindows: 'flexible',
      priorityWeights: {
        distance: 'high',
        duration: 'medium',
        cost: 'low',
      },
    },
  });

  const setSource = (source: ScheduleSource) => {
    setState(prev => ({ ...prev, source, step: 2 }));
  };

  const setMode = (mode: ScheduleMode) => {
    setState(prev => ({ ...prev, mode, step: 3 }));
  };

  const setSelectedFacilities = (facilityIds: string[]) => {
    setState(prev => ({ ...prev, selectedFacilities: facilityIds }));
  };

  const addBatch = (batch: BatchData) => {
    setState(prev => ({
      ...prev,
      batches: [...prev.batches, batch],
    }));
  };

  const removeBatch = (batchId: string) => {
    setState(prev => ({
      ...prev,
      batches: prev.batches.filter(b => b.id !== batchId),
    }));
  };

  const updateBatch = (batchId: string, updates: Partial<BatchData>) => {
    setState(prev => ({
      ...prev,
      batches: prev.batches.map(b => b.id === batchId ? { ...b, ...updates } : b),
    }));
  };

  const setBatches = (batches: BatchData[]) => {
    setState(prev => ({ ...prev, batches }));
  };

  const setOptimizationParams = (params: Partial<WizardState['optimizationParams']>) => {
    setState(prev => ({
      ...prev,
      optimizationParams: { ...prev.optimizationParams, ...params },
    }));
  };

  const setUploadedFile = (file: File, parsedData: any) => {
    setState(prev => ({ ...prev, uploadedFile: file, parsedData }));
  };

  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, step }));
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  };

  const reset = () => {
    setState({
      step: 1,
      source: null,
      mode: null,
      selectedFacilities: [],
      batches: [],
      optimizationParams: {
        capacityThreshold: 80,
        timeWindows: 'flexible',
        priorityWeights: {
          distance: 'high',
          duration: 'medium',
          cost: 'low',
        },
      },
    });
  };

  return {
    state,
    setSource,
    setMode,
    setSelectedFacilities,
    addBatch,
    removeBatch,
    updateBatch,
    setBatches,
    setOptimizationParams,
    setUploadedFile,
    goToStep,
    nextStep,
    prevStep,
    reset,
  };
}
