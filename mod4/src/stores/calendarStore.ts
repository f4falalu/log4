// MOD4 Calendar Store
// State management for delivery calendar

import { create } from 'zustand';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import {
  DailyDeliverySummary,
  DeliveryRecord,
  getDeliverySummary,
  getDeliveriesByDate
} from '@/lib/db/batches';
import { getDB } from '@/lib/db/schema';

interface CalendarState {
  // Current view
  currentMonth: Date;
  selectedDate: Date | null;
  
  // Data
  summaryMap: Map<string, DailyDeliverySummary>;
  selectedDayDeliveries: DeliveryRecord[];
  
  // Loading states
  isLoading: boolean;
  isLoadingDay: boolean;
  
  // Actions
  setCurrentMonth: (month: Date) => void;
  selectDate: (date: Date | null) => void;
  loadMonthData: (month: Date) => Promise<void>;
  loadDayDeliveries: (date: Date) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  currentMonth: new Date(),
  selectedDate: null,
  summaryMap: new Map(),
  selectedDayDeliveries: [],
  isLoading: false,
  isLoadingDay: false,

  setCurrentMonth: (month) => {
    set({ currentMonth: month });
    get().loadMonthData(month);
  },

  selectDate: async (date) => {
    set({ selectedDate: date });
    if (date) {
      await get().loadDayDeliveries(date);
    } else {
      set({ selectedDayDeliveries: [] });
    }
  },

  loadMonthData: async (month) => {
    set({ isLoading: true });
    
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const summary = await getDeliverySummary(start, end);
      
      set({ summaryMap: summary });
    } catch (error) {
      console.error('Failed to load month data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadDayDeliveries: async (date) => {
    set({ isLoadingDay: true });

    try {
      const deliveries = await getDeliveriesByDate(date);
      set({ selectedDayDeliveries: deliveries });
    } catch (error) {
      console.error('Failed to load day deliveries:', error);
      set({ selectedDayDeliveries: [] });
    } finally {
      set({ isLoadingDay: false });
    }
  },
}));
