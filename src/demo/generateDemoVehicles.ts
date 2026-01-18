// src/demo/generateDemoVehicles.ts

export type DemoVehicle = {
  id: string;
  type: 'truck' | 'van' | 'bike';
  status: 'active' | 'delayed' | 'idle';
  location: {
    lat: number;
    lng: number;
    heading: number;
    speedKph: number;
  };
  capacity: {
    total: number;
    used: number;
    available: number;
    utilization: number;
  };
  meta: {
    driverId: string;
    batchId?: string;
  };
};

const KANO_CENTER = { lat: 12.0022, lng: 8.5919 };
const EARTH_RADIUS_KM = 6371;

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomHeading() {
  return Math.floor(Math.random() * 360);
}

function offsetLatLng(
  lat: number,
  lng: number,
  radiusKm: number
): { lat: number; lng: number } {
  const d = radiusKm / EARTH_RADIUS_KM;
  const theta = Math.random() * 2 * Math.PI;

  const newLat = lat + (d * Math.cos(theta)) * (180 / Math.PI);
  const newLng =
    lng +
    ((d * Math.sin(theta)) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);

  return { lat: newLat, lng: newLng };
}

export function generateDemoVehicles(count = 7): DemoVehicle[] {
  return Array.from({ length: count }).map((_, i) => {
    const { lat, lng } = offsetLatLng(
      KANO_CENTER.lat,
      KANO_CENTER.lng,
      randomInRange(3, 25)
    );

    const total = 100;
    const used = Math.floor(randomInRange(10, 80));

    return {
      id: `veh-${i + 1}`,
      type: i % 3 === 0 ? 'truck' : i % 3 === 1 ? 'van' : 'bike',
      status: 'active',
      location: {
        lat,
        lng,
        heading: randomHeading(),
        speedKph: randomInRange(20, 55),
      },
      capacity: {
        total,
        used,
        available: total - used,
        utilization: used / total,
      },
      meta: {
        driverId: `drv-${i + 1}`,
        batchId: `batch-${Math.floor(i / 2) + 1}`,
      },
    };
  });
}

export function moveVehicle(
  vehicle: DemoVehicle,
  trafficFactor = 1
): DemoVehicle {
  const distanceKm = (vehicle.location.speedKph / 3600) * trafficFactor;

  const rad = vehicle.location.heading * (Math.PI / 180);
  const deltaLat = (distanceKm / EARTH_RADIUS_KM) * Math.cos(rad);
  const deltaLng =
    ((distanceKm / EARTH_RADIUS_KM) * Math.sin(rad)) /
    Math.cos((vehicle.location.lat * Math.PI) / 180);

  return {
    ...vehicle,
    location: {
      ...vehicle.location,
      lat: vehicle.location.lat + deltaLat * (180 / Math.PI),
      lng: vehicle.location.lng + deltaLng * (180 / Math.PI),
    },
  };
}
