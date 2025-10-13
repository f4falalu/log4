import { DriverStatistics, WorkingTimeData } from '@/types';

export const generateMockStatistics = (driverId: string): DriverStatistics => {
  const workingTimeData: WorkingTimeData[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    workingTimeData.push({
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      workingTime: Math.floor(Math.random() * 4 + 5), // 5-9 hours
      averageTime: 8.5,
    });
  }

  return {
    timeCategories: {
      onTheWay: 39.7,
      unloading: 28.3,
      loading: 17.4,
      waiting: 14.6,
    },
    workingTimeData,
    totalDistance: 1247.5,
    totalDeliveries: 156,
    averageRating: 4.8,
  };
};
