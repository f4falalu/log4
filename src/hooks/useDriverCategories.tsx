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
  allVehicles: DriverVehicleHistory[],
  favorites: string[]
) {
  return useMemo(() => {
    if (!drivers) return null;

    const categories: CategorizedDrivers = {
      favorites: [],
      trucks: [],
      vans: [],
      cars: [],
      other: [],
    };

    drivers.forEach(driver => {
      const currentVehicle = allVehicles.find(v => v.isCurrent);
      const driverWithVehicle = { driver, vehicle: currentVehicle };

      if (favorites.includes(driver.id)) {
        categories.favorites.push(driverWithVehicle);
      }

      const type = currentVehicle?.type?.toLowerCase();
      if (type?.includes('truck')) {
        categories.trucks.push(driverWithVehicle);
      } else if (type?.includes('van') || type?.includes('sprinter') || type?.includes('transporter')) {
        categories.vans.push(driverWithVehicle);
      } else if (type?.includes('car')) {
        categories.cars.push(driverWithVehicle);
      } else {
        categories.other.push(driverWithVehicle);
      }
    });

    return categories;
  }, [drivers, allVehicles, favorites]);
}
