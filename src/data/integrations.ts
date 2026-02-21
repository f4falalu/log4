import { AvailableIntegration } from '@/types/integration';

export const AVAILABLE_INTEGRATIONS: AvailableIntegration[] = [
  // Supply Chain Integrations
  {
    type: 'msupply',
    name: 'mSupply',
    description:
      'Open-source LMIS for pharmaceutical supply chain management. Sync stock levels, requisitions, and shipments.',
    category: 'supply_chain',
    capabilities: [
      'Stock synchronization',
      'Requisition management',
      'Shipment tracking',
      'Item catalog sync',
    ],
    icon: 'Package',
  },
  {
    type: 'nhlmis',
    name: 'NHLMIS',
    description:
      'National Health Logistics Management Information System. Government reporting and end-to-end supply chain visibility.',
    category: 'government',
    capabilities: [
      'Stock reporting',
      'Requisition sync',
      'Compliance tracking',
      'Consumption reports',
    ],
    icon: 'Building2',
  },
  {
    type: 'openlmis',
    name: 'OpenLMIS',
    description:
      'Electronic LMIS for health supply chains. Demand forecasting and analytics integration.',
    category: 'supply_chain',
    capabilities: [
      'Consumption tracking',
      'Demand forecasting',
      'Approval workflows',
      'Real-time analytics',
    ],
    icon: 'BarChart3',
    comingSoon: true,
  },

  // Fleet Telemetry
  {
    type: 'traccar',
    name: 'Traccar GPS Server',
    description:
      'Open-source GPS tracking platform supporting 200+ protocols and 2000+ device models. Real-time fleet monitoring.',
    category: 'telemetry',
    capabilities: [
      'Real-time GPS tracking',
      'Geofencing',
      'Speed monitoring',
      'Multi-device support',
    ],
    icon: 'Radar',
    isNew: true,
  },
  {
    type: 'gt02_tracker',
    name: 'GT02 GPS Tracker',
    description:
      'Low-cost GPS tracking devices with cellular connectivity. Direct TCP/UDP integration for location data.',
    category: 'telemetry',
    capabilities: [
      'GPS coordinates',
      'Speed & heading',
      'Heartbeat monitoring',
      'Connection backup',
    ],
    icon: 'MapPin',
  },
  {
    type: 'fuel_monitoring',
    name: 'Fuel Monitoring',
    description:
      'Real-time fuel level tracking and consumption analysis. Detect theft and optimize fuel costs.',
    category: 'fleet_management',
    capabilities: [
      'Fuel level monitoring',
      'Filling detection',
      'Drain alerts',
      'Consumption analytics',
    ],
    icon: 'Gauge',
    isNew: true,
  },

  // Execution System
  {
    type: 'mod4',
    name: 'Mod4 Driver System',
    description:
      'Driver execution platform for delivery batches. Link drivers via email or OTP for mobile app access.',
    category: 'execution',
    capabilities: [
      'Driver onboarding',
      'Batch assignment',
      'Proof of delivery',
      'Offline-first operation',
    ],
    icon: 'Truck',
  },
];

export const INTEGRATION_CATEGORIES = [
  { value: 'all', label: 'All Integrations' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'fleet_management', label: 'Fleet Management' },
  { value: 'telemetry', label: 'Telemetry' },
  { value: 'government', label: 'Government' },
  { value: 'execution', label: 'Execution' },
] as const;
