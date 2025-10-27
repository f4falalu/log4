import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Facility } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FacilityMapPreviewProps {
  facilities: Facility[];
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function FacilityMapPreview({ facilities }: FacilityMapPreviewProps) {
  const center: [number, number] = facilities.length > 0
    ? [facilities[0].lat, facilities[0].lng]
    : [6.5244, 3.3792]; // Lagos default

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Selected Facilities Map</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] rounded-b-lg overflow-hidden">
          <MapContainer
            center={center}
            zoom={facilities.length > 0 ? 11 : 10}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {facilities.map((facility) => (
              <Marker
                key={facility.id}
                position={[facility.lat, facility.lng]}
                icon={defaultIcon}
              >
                <Popup>
                  <div>
                    <p className="font-semibold">{facility.name}</p>
                    <p className="text-xs text-muted-foreground">{facility.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
