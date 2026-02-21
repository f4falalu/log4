export type IntegrationCategory =
  | 'supply_chain'
  | 'fleet_management'
  | 'telemetry'
  | 'government'
  | 'execution';

export type IntegrationStatus = 'active' | 'inactive' | 'configured' | 'error';

export type IntegrationType =
  | 'msupply'
  | 'nhlmis'
  | 'openlmis'
  | 'gt02_tracker'
  | 'fuel_monitoring'
  | 'traccar'
  | 'mod4';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  icon?: string;
  capabilities: string[];
  config?: IntegrationConfig;
  lastSync?: string;
  isNew?: boolean;
}

export interface IntegrationConfig {
  apiUrl?: string;
  apiKey?: string;
  username?: string;
  syncInterval?: number; // minutes
  enableWebhooks?: boolean;
  webhookUrl?: string;
  storeId?: string;
  facilityId?: string;
  // Telemetry specific
  protocol?: 'tcp' | 'udp' | 'http';
  port?: number;
  deviceIds?: string[];
  // Fuel monitoring specific
  sensorType?: 'can_bus' | 'rs485' | 'obd' | 'analog';
}

export interface AvailableIntegration {
  type: IntegrationType;
  name: string;
  description: string;
  category: IntegrationCategory;
  capabilities: string[];
  icon: string;
  isNew?: boolean;
  comingSoon?: boolean;
}
