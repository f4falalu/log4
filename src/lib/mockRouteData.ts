import { Route } from '@/types';

export const generateMockRoutes = (driverId: string): Route[] => {
  const routes: Route[] = [
    {
      id: 'RT-001',
      driverId,
      packageCount: 24,
      address: '1234 Oak Street, Downtown',
      destination: '5678 Pine Avenue, Uptown',
      distance: 12.5,
      timeLeft: 45,
      weight: 850,
      volume: 125000,
      date: new Date().toISOString(),
      status: 'on_the_way',
      mapPoints: [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7580, lng: -73.9855 },
      ],
    },
    {
      id: 'RT-002',
      driverId,
      packageCount: 18,
      address: '789 Maple Road, Westside',
      destination: '321 Elm Street, Eastside',
      distance: 8.3,
      timeLeft: 30,
      weight: 620,
      volume: 98000,
      date: new Date(Date.now() - 86400000).toISOString(),
      status: 'loading',
      mapPoints: [
        { lat: 40.7489, lng: -73.9680 },
        { lat: 40.7614, lng: -73.9776 },
      ],
    },
    {
      id: 'RT-003',
      driverId,
      packageCount: 32,
      address: '456 Cedar Lane, Northside',
      destination: '890 Birch Court, Southside',
      distance: 15.7,
      timeLeft: 60,
      weight: 1050,
      volume: 156000,
      date: new Date(Date.now() - 172800000).toISOString(),
      status: 'completed',
      mapPoints: [
        { lat: 40.7831, lng: -73.9712 },
        { lat: 40.7282, lng: -73.9942 },
      ],
    },
  ];

  return routes;
};
