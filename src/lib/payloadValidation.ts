import { Vehicle } from '@/types';

export interface PayloadItem {
  id?: string;
  name: string;
  quantity: number;
  weight_kg: number;
  volume_m3: number;
  temperature_required?: boolean;
  handling_instructions?: string;
}

export interface PayloadValidationResult {
  isValid: boolean;
  totalWeight: number;
  totalVolume: number;
  weightUtilization: number;
  volumeUtilization: number;
  overloadWarnings: string[];
  suggestedVehicle?: string;
}

export function validatePayload(
  items: PayloadItem[],
  vehicle: Vehicle
): PayloadValidationResult {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
  const totalVolume = items.reduce((sum, item) => sum + (item.volume_m3 * item.quantity), 0);
  
  const weightUtilization = (totalWeight / vehicle.maxWeight) * 100;
  const volumeUtilization = (totalVolume / vehicle.capacity) * 100;
  
  const overloadWarnings: string[] = [];
  
  if (totalWeight > vehicle.maxWeight) {
    overloadWarnings.push(
      `Weight exceeds capacity by ${(totalWeight - vehicle.maxWeight).toFixed(1)} kg`
    );
  }
  
  if (totalVolume > vehicle.capacity) {
    overloadWarnings.push(
      `Volume exceeds capacity by ${(totalVolume - vehicle.capacity).toFixed(2)} m³`
    );
  }
  
  if (weightUtilization > 95 || volumeUtilization > 95) {
    overloadWarnings.push('Near capacity limit - consider load distribution');
  }
  
  return {
    isValid: overloadWarnings.length === 0,
    totalWeight,
    totalVolume,
    weightUtilization: Math.round(weightUtilization * 10) / 10,
    volumeUtilization: Math.round(volumeUtilization * 10) / 10,
    overloadWarnings
  };
}

export function suggestVehicle(
  items: PayloadItem[],
  vehicles: Vehicle[]
): Vehicle | null {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
  const totalVolume = items.reduce((sum, item) => sum + (item.volume_m3 * item.quantity), 0);
  
  // Filter available vehicles that can handle the payload
  const suitableVehicles = vehicles.filter(v => 
    v.status === 'available' &&
    v.maxWeight >= totalWeight &&
    v.capacity >= totalVolume
  );
  
  if (suitableVehicles.length === 0) return null;
  
  // Find vehicle with best utilization (closest to full without overloading)
  return suitableVehicles.reduce((best, current) => {
    const bestUtil = Math.max(
      totalWeight / best.maxWeight,
      totalVolume / best.capacity
    );
    const currentUtil = Math.max(
      totalWeight / current.maxWeight,
      totalVolume / current.capacity
    );
    
    // Prefer 70-85% utilization
    const bestScore = Math.abs(0.8 - bestUtil);
    const currentScore = Math.abs(0.8 - currentUtil);
    
    return currentScore < bestScore ? current : best;
  });
}

export function calculatePayloadUtilization(
  totalWeight: number,
  totalVolume: number,
  vehicle: Vehicle
): number {
  const weightUtil = (totalWeight / vehicle.maxWeight) * 100;
  const volumeUtil = (totalVolume / vehicle.capacity) * 100;
  
  // Return the higher utilization (limiting factor)
  return Math.max(weightUtil, volumeUtil);
}
