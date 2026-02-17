import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgramOverviewTab } from './components/ProgramOverviewTab';
import { ProgramConfigurationTab } from './components/ProgramConfigurationTab';
import { ProgramMetricsTab } from './components/ProgramMetricsTab';

const VALID_TABS = ['overview', 'configuration', 'metrics'] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function ProgramsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabValue | null;
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'overview';

  const handleTabChange = (value: string) => {
    if (value === 'overview') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
        <p className="text-muted-foreground mt-1">
          Manage operational programs and funding configurations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ProgramOverviewTab />
        </TabsContent>
        <TabsContent value="configuration" className="mt-6">
          <ProgramConfigurationTab />
        </TabsContent>
        <TabsContent value="metrics" className="mt-6">
          <ProgramMetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
