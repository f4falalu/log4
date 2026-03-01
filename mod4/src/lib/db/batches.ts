// MOD4 Batch Database Operations
// Historical and scheduled delivery queries

import { getDB, Batch, Slot } from './schema';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

export interface DailyDeliverySummary {
  date: Date;
  dateKey: string;
  total: number;
  completed: number;
  skipped: number;
  failed: number;
  pending: number;
}

export interface DeliveryRecord {
  slotId: string;
  batchId: string;
  facilityId: string;
  facilityName: string;
  facilityAddress: string;
  status: Slot['status'];
  scheduledTime?: number;
  actualTime?: number;
  sequence: number;
}

/**
 * Get all historical batches from IndexedDB
 */
export async function getHistoricalBatches(): Promise<Batch[]> {
  const db = await getDB();
  return db.getAll('batches');
}

/**
 * Get deliveries for a specific date
 */
export async function getDeliveriesByDate(date: Date): Promise<DeliveryRecord[]> {
  const db = await getDB();
  const batches = await db.getAll('batches');
  
  const dayStart = startOfDay(date).getTime();
  const dayEnd = endOfDay(date).getTime();
  
  const deliveries: DeliveryRecord[] = [];
  
  for (const batch of batches) {
    for (const slot of batch.slots) {
      const slotTime = slot.actual_time ?? slot.scheduled_time ?? batch.created_at;
      
      if (slotTime >= dayStart && slotTime <= dayEnd) {
        const facility = batch.facilities.find(f => f.id === slot.facility_id);
        
        deliveries.push({
          slotId: slot.id,
          batchId: batch.id,
          facilityId: slot.facility_id,
          facilityName: facility?.name ?? 'Unknown',
          facilityAddress: facility?.address ?? '',
          status: slot.status,
          scheduledTime: slot.scheduled_time,
          actualTime: slot.actual_time,
          sequence: slot.sequence,
        });
      }
    }
  }
  
  return deliveries.sort((a, b) => a.sequence - b.sequence);
}

/**
 * Get delivery summary for a date range
 */
export async function getDeliverySummary(
  startDate: Date,
  endDate: Date
): Promise<Map<string, DailyDeliverySummary>> {
  const db = await getDB();
  const batches = await db.getAll('batches');
  
  const summaryMap = new Map<string, DailyDeliverySummary>();
  
  // Initialize all days in range
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  for (const day of days) {
    const dateKey = format(day, 'yyyy-MM-dd');
    summaryMap.set(dateKey, {
      date: day,
      dateKey,
      total: 0,
      completed: 0,
      skipped: 0,
      failed: 0,
      pending: 0,
    });
  }
  
  // Count deliveries per day
  for (const batch of batches) {
    for (const slot of batch.slots) {
      const slotTime = slot.actual_time ?? slot.scheduled_time ?? batch.created_at;
      const slotDate = new Date(slotTime);
      const dateKey = format(slotDate, 'yyyy-MM-dd');
      
      const summary = summaryMap.get(dateKey);
      if (summary) {
        summary.total++;
        
        switch (slot.status) {
          case 'delivered':
            summary.completed++;
            break;
          case 'skipped':
            summary.skipped++;
            break;
          case 'failed':
            summary.failed++;
            break;
          case 'pending':
          case 'active':
            summary.pending++;
            break;
        }
      }
    }
  }
  
  return summaryMap;
}

// Mock data functions removed - real data comes from Supabase batches
