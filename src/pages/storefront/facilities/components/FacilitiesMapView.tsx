import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon, LatLngBounds } from 'leaflet';
import { Facility } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface FacilitiesMapViewProps {
  facilities: Facility[];
  onFacilityClick: (facility: Facility) => void;
  selectedFacility?: Facility | null;
}

// Component to handle map bounds and center
function MapController({ facilities }: { facilities: Facility[] }) {
  const map = useMap();

  useEffect(() => {
    if (facilities.length > 0) {
      const bounds = new LatLngBounds(
        facilities.map((f) => [f.lat, f.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [facilities, map]);

  return null;
}

// Custom cluster icon based on cluster size
const createClusterCustomIcon = function (cluster: any) {
  const count = cluster.getChildCount();
  let size = 'small';

  if (count > 50) {
    size = 'large';
  } else if (count > 10) {
    size = 'medium';
  }

  return new Icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%232563eb' opacity='0.8'/%3E%3Ctext x='20' y='26' text-anchor='middle' fill='white' font-size='14' font-weight='bold'%3E${count}%3C/text%3E%3C/svg%3E`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

export function FacilitiesMapView({
  facilities,
  onFacilityClick,
  selectedFacility,
}: FacilitiesMapViewProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Default center (Kano, Nigeria)
  const defaultCenter: [number, number] = [12.0, 8.52];
  const defaultZoom = 10;

  useEffect(() => {
    // Get user's location if available
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  }, []);

  const getMarkerColor = (facility: Facility) => {
    // Color code by level of care
    switch (facility.level_of_care) {
      case 'Tertiary':
        return '#dc2626'; // red
      case 'Secondary':
        return '#ea580c'; // orange
      case 'Primary':
        return '#16a34a'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const createCustomIcon = (facility: Facility) => {
    const color = getMarkerColor(facility);
    const isSelected = selectedFacility?.id === facility.id;

    return new Icon({
      iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='42' viewBox='0 0 24 32'%3E%3Cpath fill='${encodeURIComponent(
        color
      )}' stroke='${isSelected ? '%23000' : '%23fff'}' stroke-width='${
        isSelected ? '2' : '1'
      }' d='M12 0C7.589 0 4 3.589 4 8c0 6 8 16 8 16s8-10 8-16c0-4.411-3.589-8-8-8zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z'/%3E%3C/svg%3E`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42],
    });
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController facilities={facilities} />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={true}
          zoomToBoundsOnClick={true}
        >
          {facilities.map((facility) => (
            <Marker
              key={facility.id}
              position={[facility.lat, facility.lng]}
              icon={createCustomIcon(facility)}
              eventHandlers={{
                click: () => onFacilityClick(facility),
              }}
            >
              <Popup>
                <div className="min-w-[250px] p-2">
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-base">{facility.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {facility.warehouse_code}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {facility.level_of_care && (
                        <Badge variant="outline" className="text-xs">
                          {facility.level_of_care}
                        </Badge>
                      )}
                      {facility.programme && (
                        <Badge variant="secondary" className="text-xs">
                          {facility.programme}
                        </Badge>
                      )}
                      {facility.service_zone && (
                        <Badge className="text-xs">{facility.service_zone}</Badge>
                      )}
                    </div>

                    <div className="text-sm space-y-1">
                      {facility.lga && (
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          <span className="text-xs">
                            {facility.lga}
                            {facility.ward && `, ${facility.ward}`}
                          </span>
                        </div>
                      )}
                      {facility.address && (
                        <p className="text-xs text-muted-foreground">
                          {facility.address}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1"
                        onClick={() => onFacilityClick(facility)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps?q=${facility.lat},${facility.lng}`,
                            '_blank'
                          )
                        }
                      >
                        <Navigation className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* User location marker if available */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={
              new Icon({
                iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%234f46e5'/%3E%3C/svg%3E`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })
            }
          >
            <Popup>Your Location</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border z-floating">
        <div className="text-xs font-semibold mb-2">Level of Care</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <span className="text-xs">Tertiary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span className="text-xs">Secondary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-xs">Primary</span>
          </div>
        </div>
      </div>

      {/* Facility count badge */}
      <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg border z-floating">
        <div className="text-xs text-muted-foreground">Facilities</div>
        <div className="text-lg font-semibold">{facilities.length}</div>
      </div>
    </div>
  );
}
