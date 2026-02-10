import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoneTabContent } from './components/ZoneTabContent';
import { ServiceAreaTabContent } from './components/ServiceAreaTabContent';
import { RouteManagementTabContent } from './components/RouteManagementTabContent';

const VALID_TABS = ['zones', 'service-areas', 'routes'] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function ZonesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabValue | null;
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'zones';

  const handleTabChange = (value: string) => {
    if (value === 'zones') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Zones & Logistics</h1>
        <p className="text-muted-foreground mt-1">
          Manage zones, service areas, and delivery routes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="service-areas">Service Areas</TabsTrigger>
          <TabsTrigger value="routes">Route Management</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-6">
          <ZoneTabContent />
        </TabsContent>
        <TabsContent value="service-areas" className="mt-6">
          <ServiceAreaTabContent />
        </TabsContent>
        <TabsContent value="routes" className="mt-6">
          <RouteManagementTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
