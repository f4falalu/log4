import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Facility } from '@/types';

interface FacilitiesMapViewProps {
  facilities: Facility[];
  selectedFacility: Facility | null;
  onFacilitySelect: (facility: Facility | null) => void;
  onViewDetails: (facility: Facility) => void;
}

// Color mapping for level of care
const levelColors: Record<string, string> = {
  Tertiary: '#dc2626',
  Secondary: '#ea580c',
  Primary: '#16a34a',
  default: '#6b7280',
};

export function FacilitiesMapView({
  facilities,
  selectedFacility,
  onFacilitySelect,
  onViewDetails,
}: FacilitiesMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = facilities.length > 0
      ? [facilities[0].lng, facilities[0].lat]
      : [8.52, 12.0]; // Kano, Nigeria (lng, lat for MapLibre)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: defaultCenter,
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update markers when facilities change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    facilities.forEach((facility) => {
      const color = levelColors[facility.level_of_care || 'default'] || levelColors.default;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'facility-marker';
      el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        "></div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([facility.lng, facility.lat])
        .addTo(map);

      // Click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onFacilitySelect(facility);

        // Remove existing popup
        popupRef.current?.remove();

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'facility-popup';
        popupContent.innerHTML = `
          <div style="min-width: 250px; max-width: 300px; font-family: system-ui, sans-serif;">
            <div style="margin-bottom: 8px;">
              <h4 style="font-weight: 600; font-size: 14px; margin: 0;">${facility.name}</h4>
              <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
                ${facility.lga || ''}${facility.lga && facility.state ? ', ' : ''}${facility.state || ''}
              </p>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 12px;">
              <span style="color: #6b7280;">${facility.address || 'No address'}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div style="text-align: center; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <div style="font-size: 11px; color: #6b7280;">Storage</div>
                <div style="font-size: 14px; font-weight: 500;">
                  ${facility.storage_capacity?.toLocaleString() ?? 'N/A'}
                </div>
              </div>
              <div style="text-align: center; padding: 8px; background: #f3f4f6; border-radius: 4px;">
                <div style="font-size: 11px; color: #6b7280;">General</div>
                <div style="font-size: 14px; font-weight: 500;">
                  ${facility.capacity?.toLocaleString() ?? 'N/A'}
                </div>
              </div>
            </div>

            ${
              facility.pcr_service || facility.cd4_service
                ? `<div style="display: flex; gap: 4px; margin-bottom: 8px;">
                    ${facility.pcr_service ? '<span style="display: inline-flex; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: #dcfce7; color: #166534;">PCR</span>' : ''}
                    ${facility.cd4_service ? '<span style="display: inline-flex; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: #dbeafe; color: #1e40af;">CD4</span>' : ''}
                  </div>`
                : ''
            }

            <div style="display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <button id="view-details-${facility.id}" style="
                flex: 1;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 500;
                color: white;
                background: #2563eb;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              ">View Details</button>
              <button id="navigate-${facility.id}" style="
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 500;
                color: #374151;
                background: #f3f4f6;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              ">📍</button>
            </div>
          </div>
        `;

        // Add button event listeners
        setTimeout(() => {
          const viewBtn = document.getElementById(`view-details-${facility.id}`);
          const navBtn = document.getElementById(`navigate-${facility.id}`);

          viewBtn?.addEventListener('click', () => {
            onViewDetails(facility);
          });

          navBtn?.addEventListener('click', () => {
            window.open(
              `https://www.google.com/maps?q=${facility.lat},${facility.lng}`,
              '_blank'
            );
          });
        }, 0);

        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
        })
          .setLngLat([facility.lng, facility.lat])
          .setDOMContent(popupContent)
          .addTo(map);

        popupRef.current = popup;
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have facilities
    if (facilities.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      facilities.forEach((f) => bounds.extend([f.lng, f.lat]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 13 });
    }
  }, [facilities, mapLoaded, onFacilitySelect, onViewDetails]);

  // Highlight selected facility
  useEffect(() => {
    // Could add highlight logic here if needed
  }, [selectedFacility]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Legend - positioned top-right to avoid zoom controls */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border z-10">
        <div className="text-xs font-semibold mb-2">Level of Care</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-xs">Tertiary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs">Secondary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-xs">Primary</span>
          </div>
        </div>
      </div>

      {/* Facility count - positioned bottom-left */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg border z-10">
        <div className="text-xs text-gray-500">Showing</div>
        <div className="text-lg font-semibold">{facilities.length} facilities</div>
      </div>
    </div>
  );
}
