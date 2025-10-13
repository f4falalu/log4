import { useMemo } from 'react';
import { Driver, DriverVehicleHistory } from '@/types';

interface DriverWithVehicle {
  driver: Driver;
  vehicle?: DriverVehicleHistory;
}

interface CategorizedDrivers {
  favorites: DriverWithVehicle[];
  trucks: DriverWithVehicle[];
  vans: DriverWithVehicle[];
  cars: DriverWithVehicle[];
  other: DriverWithVehicle[];
}

export function useDriverCategories(
  drivers: Driver[] | undefined,
  allVehicles: (DriverVehicleHistory & { driverId: string })[] | undefined,
  favorites: string[]
) {
  return useMemo(() => {
    // Guard against null/undefined inputs
    if (!drivers || !Array.isArray(drivers)) return null;
    if (!allVehicles || !Array.isArray(allVehicles)) return null;
    if (!Array.isArray(favorites)) return null;

    const categories: CategorizedDrivers = {
      favorites: [],
      trucks: [],
      vans: [],
      cars: [],
      other: [],
    };

    try {
      drivers.forEach(driver => {
        if (!driver || !driver.id) return;

        const currentVehicle = allVehicles.find(v => 
          v && v.driverId === driver.id && v.isCurrent === true
        );
        const driverWithVehicle = { driver, vehicle: currentVehicle };

        // Add to favorites if in the favorites list
        if (favorites.includes(driver.id)) {
          categories.favorites.push(driverWithVehicle);
        }

        // Categorize by vehicle type
        const type = currentVehicle?.type?.toLowerCase() || '';
        if (type.includes('truck')) {
          categories.trucks.push(driverWithVehicle);
        } else if (type.includes('van') || type.includes('sprinter') || type.includes('transporter')) {
          categories.vans.push(driverWithVehicle);
        } else if (type.includes('car')) {
          categories.cars.push(driverWithVehicle);
        } else {
          categories.other.push(driverWithVehicle);
        }
      });
    } catch (error) {
      console.error('Error categorizing drivers:', error);
      return null;
    }

    return categories;
  }, [drivers, allVehicles, favorites]);
}
