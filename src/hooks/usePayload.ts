import { usePayloadItems } from './usePayloadItems';
import { useVehiclePayload } from './useVehiclePayload';

/**
 * Unified payload hook - consolidates batch and vehicle payload data
 * @param vehicleId - Optional vehicle ID for vehicle-specific payload
 * @param batchId - Optional batch ID for batch-specific payload
 */
export function usePayload(vehicleId?: string | null, batchId?: string | null) {
  const { data: batchPayload, isLoading: batchLoading } = usePayloadItems();
  const { data: vehiclePayload, isLoading: vehicleLoading } = useVehiclePayload(vehicleId);

  const isLoading = batchLoading || vehicleLoading;

  // Filter by batch if specified
  const filteredBatchPayload = batchId
    ? batchPayload?.filter(item => item.batch_id === batchId)
    : batchPayload;

  // Calculate aggregates
  const totalWeight = filteredBatchPayload?.reduce((sum, item) => sum + (item.weight_kg || 0), 0) || 0;
  const totalVolume = filteredBatchPayload?.reduce((sum, item) => sum + (item.volume_m3 || 0), 0) || 0;
  const totalQuantity = filteredBatchPayload?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const utilizationPct = vehiclePayload?.utilizationPct || 0;

  return {
    vehiclePayload,
    batchPayload: filteredBatchPayload,
    totalWeight,
    totalVolume,
    totalQuantity,
    utilizationPct,
    isLoading,
  };
}
