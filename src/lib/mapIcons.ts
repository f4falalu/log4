import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export const MapIcons = {
  facility: (selected = false) => L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  
  warehouse: (selected = false) => L.divIcon({
    html: `
      <div style="
        background-color: hsl(195 100% 28%);
        border: 3px solid hsl(0 0% 100%);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px -2px hsl(195 100% 28% / 0.3);
      ">
        <div style="
          background-color: hsl(0 0% 100%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'warehouse-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  }),
  
  driver: (status: 'available' | 'busy' | 'offline', initials: string, isActive = false) => {
    const statusColors = {
      available: 'hsl(142 76% 36%)',
      busy: 'hsl(38 92% 50%)',
      offline: 'hsl(240 3.8% 46.1%)'
    };
    
    const bgColor = statusColors[status];
    const pulseAnimation = isActive ? `
      @keyframes pulse-driver {
        0%, 100% { box-shadow: 0 0 0 0 ${bgColor}80; }
        50% { box-shadow: 0 0 0 8px ${bgColor}00; }
      }
    ` : '';
    
    return L.divIcon({
      html: `
        <style>${pulseAnimation}</style>
        <div style="
          background-color: ${bgColor};
          border: 3px solid hsl(0 0% 100%);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px -2px ${bgColor}80;
          font-weight: 600;
          color: white;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ${isActive ? `animation: pulse-driver 2s infinite;` : ''}
        ">
          ${initials}
        </div>
      `,
      className: 'driver-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  },
  
  waypoint: (number: number) => L.divIcon({
    html: `
      <div style="
        background-color: hsl(0 0% 100%);
        border: 2px solid hsl(195 100% 28%);
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: hsl(195 100% 28%);
        font-size: 12px;
        box-shadow: 0 2px 8px -2px rgba(0,0,0,0.3);
      ">
        ${number}
      </div>
    `,
    className: 'waypoint-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  }),
};
