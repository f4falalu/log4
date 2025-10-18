import { supabase } from '@/integrations/supabase/client';
import { Vehicle, DeliveryBatch } from '@/types';

export interface HandoffRequest {
  fromVehicleId: string;
  toVehicleId: string;
  fromBatchId: string;
  toBatchId?: string;
  locationLat: number;
  locationLng: number;
  locationName?: string;
  itemsTransferred: string[]; // Array of payload_item IDs
  plannedTime?: string;
  notes?: string;
}

export interface Handoff {
  id: string;
  from_vehicle_id: string;
  to_vehicle_id: string;
  from_batch_id: string;
  to_batch_id?: string;
  location_lat: number;
  location_lng: number;
  location_name?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  items_transferred: any[];
  planned_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function initiateHandoff(request: HandoffRequest): Promise<Handoff> {
  const { data, error } = await supabase
    .from('handoffs')
    .insert({
      from_vehicle_id: request.fromVehicleId,
      to_vehicle_id: request.toVehicleId,
      from_batch_id: request.fromBatchId,
      to_batch_id: request.toBatchId,
      location_lat: request.locationLat,
      location_lng: request.locationLng,
      location_name: request.locationName,
      status: 'planned',
      items_transferred: request.itemsTransferred,
      planned_time: request.plannedTime,
      notes: request.notes
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeHandoff(
  handoffId: string,
  actualEndTime?: string
): Promise<void> {
  const { error } = await supabase
    .from('handoffs')
    .update({
      status: 'completed',
      actual_end_time: actualEndTime || new Date().toISOString()
    })
    .eq('id', handoffId);

  if (error) throw error;
}

export async function cancelHandoff(handoffId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('handoffs')
    .update({
      status: 'cancelled',
      notes: reason
    })
    .eq('id', handoffId);

  if (error) throw error;
}

export async function getActiveHandoffs(): Promise<Handoff[]> {
  const { data, error } = await supabase
    .from('handoffs')
    .select('*')
    .in('status', ['planned', 'in-progress'])
    .order('planned_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function validateHandoffLocation(
  vehicleLat: number,
  vehicleLng: number,
  handoffLat: number,
  handoffLng: number,
  maxDistanceKm: number = 0.5
): Promise<boolean> {
  const distance = calculateDistance(vehicleLat, vehicleLng, handoffLat, handoffLng);
  return distance <= maxDistanceKm;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
