/**
 * Stock Analytics Hooks
 * React Query hooks for stock reporting and analytics
 */

import { useQuery } from '@tanstack/react-query';
import {
  getStockStatus,
  getStockBalance,
  getStockPerformance,
  getStockByZone,
  getLowStockAlerts,
} from '@/integrations/supabase/analytics';
import type {
  StockStatus,
  StockBalance,
  StockPerformance,
  StockByZone,
  LowStockAlert,
} from '@/types';

/**
 * Hook to fetch overall stock status
 * Includes: total products, facilities with stock, total items, low stock count, out of stock count
 * Stale time: 5 minutes (stock levels change moderately)
 */
export function useStockStatus() {
  return useQuery<StockStatus, Error>({
    queryKey: ['stock-status'],
    queryFn: () => getStockStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch stock balance (allocated vs available) by product
 * @param productName - Optional product name to filter by
 * Stale time: 5 minutes
 */
export function useStockBalance(productName?: string) {
  return useQuery<StockBalance[], Error>({
    queryKey: ['stock-balance', productName],
    queryFn: () => getStockBalance(productName),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch stock performance metrics
 * Includes: turnover rate, avg days supply, total delivered, current stock
 * @param startDate - Optional start date (YYYY-MM-DD)
 * @param endDate - Optional end date (YYYY-MM-DD)
 * Stale time: 10 minutes (performance metrics change slowly)
 */
export function useStockPerformance(startDate?: string, endDate?: string) {
  return useQuery<StockPerformance[], Error>({
    queryKey: ['stock-performance', startDate, endDate],
    queryFn: () => getStockPerformance(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch stock distribution by service zone
 * Includes: total products, quantity, facilities count, low stock facilities per zone
 * Stale time: 5 minutes
 */
export function useStockByZone() {
  return useQuery<StockByZone[], Error>({
    queryKey: ['stock-by-zone'],
    queryFn: () => getStockByZone(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch low stock alerts
 * @param thresholdDays - Days of supply threshold (default: 7)
 * Stale time: 2 minutes (more critical, refresh more frequently)
 */
export function useLowStockAlerts(thresholdDays: number = 7) {
  return useQuery<LowStockAlert[], Error>({
    queryKey: ['low-stock-alerts', thresholdDays],
    queryFn: () => getLowStockAlerts(thresholdDays),
    staleTime: 2 * 60 * 1000, // 2 minutes (more critical data)
    refetchOnWindowFocus: true, // Refetch on window focus for alerts
  });
}
