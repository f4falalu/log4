/**
 * Calendar types for the scheduler
 */

export type CalendarViewMode = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  batchId: string;
  batchCode: string;
  title: string;
  start: Date;
  end: Date;
  timeWindow: 'morning' | 'afternoon' | 'evening' | string;
  status: 'draft' | 'ready' | 'scheduled' | 'published' | 'cancelled';
  facilityCount: number;
  warehouseName: string;
  driverName?: string;
  vehiclePlate?: string;
  priority: 'low' | 'medium' | 'high';
  capacityUtilization?: number;
}
