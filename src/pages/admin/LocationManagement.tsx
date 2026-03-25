/**
 * Location Management Settings Page
 *
 * Allows admins to:
 * 1. Import OSM admin boundaries via Overpass API for any configured country
 * 2. View imported admin units (States/Regions, LGAs/Districts)
 * 3. Monitor boundary import progress
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  fetchBoundariesFromOverpass,
  saveBoundariesToDB,
  COUNTRY_ADMIN_LEVELS,
  type ImportProgress,
} from '@/lib/overpass-boundaries';
import { Download, MapPin, RefreshCw, AlertCircle, CheckCircle, Globe, Loader2 } from 'lucide-react';

export default function LocationManagement() {
  const { workspaceId } = useWorkspace();
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: 'idle',
    message: '',
    progress: 0,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');

  // Fetch workspace countries
  const { data: workspaceCountries = [] } = useQuery({
    queryKey: ['workspace-countries', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_countries')
        .select('id, country_id, is_primary, countries(id, name, iso_code)')
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        country_id: string;
        is_primary: boolean;
        countries: { id: string; name: string; iso_code: string } | null;
      }>;
    },
    enabled: !!workspaceId,
  });

  // Auto-select primary country
  const effectiveCountryId =
    selectedCountryId ||
    workspaceCountries.find((wc) => wc.is_primary)?.country_id ||
    workspaceCountries[0]?.country_id ||
    '';

  const selectedWC = workspaceCountries.find((wc) => wc.country_id === effectiveCountryId);
  const isoCode = selectedWC?.countries?.iso_code || '';
  const countryName = selectedWC?.countries?.name || 'Unknown';
  const adminConfig = COUNTRY_ADMIN_LEVELS[isoCode];

  // Fetch existing admin units for the selected country
  const { data: adminUnits = [], isLoading: unitsLoading, refetch: refetchUnits } = useQuery({
    queryKey: ['admin-units', effectiveCountryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_units')
        .select('id, name, name_en, admin_level, osm_id, population, is_active')
        .eq('country_id', effectiveCountryId)
        .order('admin_level')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCountryId,
  });

  const stateUnits = adminUnits.filter((u) => u.admin_level === (adminConfig?.states || 4));
  const districtUnits = adminUnits.filter((u) => u.admin_level === (adminConfig?.districts || 6));

  /**
   * Import boundaries from Overpass API
   */
  const handleImportBoundaries = async () => {
    if (!effectiveCountryId || !isoCode) {
      toast.error('Please select a country first');
      return;
    }

    const levels = adminConfig
      ? [adminConfig.states, adminConfig.districts]
      : [4, 6]; // sensible defaults

    try {
      setIsImporting(true);
      setImportProgress({ status: 'fetching', message: 'Starting...', progress: 0 });

      // Step 1: Fetch from Overpass
      const boundaries = await fetchBoundariesFromOverpass(isoCode, levels, setImportProgress);

      if (boundaries.length === 0) {
        toast.warning('No boundaries found', {
          description: `Overpass returned 0 results for ${countryName}. Check the country ISO code.`,
        });
        setIsImporting(false);
        setImportProgress({ status: 'idle', message: '', progress: 0 });
        return;
      }

      // Step 2: Save to DB
      const imported = await saveBoundariesToDB(
        supabase,
        boundaries,
        effectiveCountryId,
        workspaceId!,
        setImportProgress
      );

      toast.success('Import Complete', {
        description: `Imported ${imported} boundaries for ${countryName}`,
      });

      refetchUnits();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setImportProgress({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const renderStatusBadge = () => {
    const { status } = importProgress;
    if (status === 'idle') return null;

    const config: Record<string, { label: string; variant: 'default' | 'destructive'; icon: typeof Download }> = {
      fetching: { label: 'Fetching', variant: 'default', icon: Download },
      parsing: { label: 'Parsing', variant: 'default', icon: RefreshCw },
      saving: { label: 'Saving', variant: 'default', icon: MapPin },
      complete: { label: 'Complete', variant: 'default', icon: CheckCircle },
      error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
    };

    const cfg = config[status] || config.fetching;
    const Icon = cfg.icon;

    return (
      <Badge variant={cfg.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Locations</h1>
          <p className="text-muted-foreground">
            Manage administrative boundaries and geographic data
          </p>
        </div>

        {workspaceCountries.length > 1 && (
          <Select
            value={effectiveCountryId}
            onValueChange={setSelectedCountryId}
          >
            <SelectTrigger className="w-52">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent>
              {workspaceCountries.map((wc) => (
                <SelectItem key={wc.country_id} value={wc.country_id}>
                  {wc.countries?.name} ({wc.countries?.iso_code})
                  {wc.is_primary ? ' (Primary)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {workspaceCountries.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No countries configured for this workspace. Go to{' '}
            <strong>General Settings &gt; Region</strong> to add countries first.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="boundaries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="boundaries">
              {adminConfig?.label_states || 'States'} &amp; {adminConfig?.label_districts || 'Districts'}
            </TabsTrigger>
            <TabsTrigger value="import">Import from OSM</TabsTrigger>
          </TabsList>

          {/* Boundaries Tab */}
          <TabsContent value="boundaries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Administrative Boundaries — {countryName}
                </CardTitle>
                <CardDescription>
                  {stateUnits.length} {adminConfig?.label_states || 'states'},{' '}
                  {districtUnits.length} {adminConfig?.label_districts || 'districts'} imported
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unitsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : adminUnits.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No boundaries imported yet. Use the "Import from OSM" tab to download boundaries for {countryName}.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border rounded-lg max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Population</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminUnits.slice(0, 200).map((unit) => (
                          <TableRow key={unit.id}>
                            <TableCell className="font-medium">{unit.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {unit.admin_level === (adminConfig?.states || 4)
                                  ? adminConfig?.label_states || 'State'
                                  : adminConfig?.label_districts || 'District'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {unit.population?.toLocaleString() || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={unit.is_active ? 'default' : 'outline'}
                                className={
                                  unit.is_active
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'text-muted-foreground'
                                }
                              >
                                {unit.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {adminUnits.length > 200 && (
                      <p className="text-xs text-muted-foreground p-3 text-center">
                        Showing first 200 of {adminUnits.length} entries
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Boundaries from OpenStreetMap</CardTitle>
                <CardDescription>
                  Download admin boundaries for {countryName} via the Overpass API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    This queries the Overpass API for {countryName} ({isoCode}) administrative boundaries.
                    {adminConfig ? (
                      <> Importing {adminConfig.label_states} (level {adminConfig.states}) and{' '}
                        {adminConfig.label_districts} (level {adminConfig.districts}).</>
                    ) : (
                      <> Importing admin levels 4 and 6.</>
                    )}
                    {' '}The query may take 30-60 seconds.
                  </AlertDescription>
                </Alert>

                {/* Progress */}
                {importProgress.status !== 'idle' && (
                  <div className="space-y-2 p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Import Status</span>
                      {renderStatusBadge()}
                    </div>
                    <Progress value={importProgress.progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">{importProgress.message}</p>
                    {importProgress.total != null && (
                      <p className="text-xs text-muted-foreground">
                        {importProgress.imported || 0} / {importProgress.total} boundaries
                      </p>
                    )}
                    {importProgress.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{importProgress.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Import Button */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleImportBoundaries}
                    disabled={isImporting || !effectiveCountryId}
                    size="lg"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import {countryName} Boundaries
                      </>
                    )}
                  </Button>

                  {importProgress.status === 'complete' && (
                    <Badge className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600">
                      <CheckCircle className="h-3 w-3" />
                      Last import successful
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Source:</strong> OpenStreetMap via Overpass API</p>
                  <p><strong>License:</strong> OpenStreetMap ODbL</p>
                  <p><strong>Note:</strong> Existing boundaries with the same OSM ID will be updated (upsert)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
