/**
 * Location Management Admin Page
 *
 * This page allows admins to:
 * 1. Import OSM admin boundaries from Geofabrik (manual button click)
 * 2. View and manage admin units (States, LGAs, Wards)
 * 3. Manually create new LGAs (admin-only, no auto-create)
 * 4. Monitor boundary import progress
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_COUNTRY_NIGERIA_ID, DEFAULT_WORKSPACE_KANO_PHARMA_ID } from '@/lib/constants';
import { Download, MapPin, Plus, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportProgress {
  status: 'idle' | 'downloading' | 'parsing' | 'importing' | 'complete' | 'error';
  message: string;
  progress: number;
  totalBoundaries?: number;
  importedBoundaries?: number;
  error?: string;
}

export default function LocationManagement() {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: 'idle',
    message: '',
    progress: 0,
  });
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Handle OSM boundary import button click
   * This triggers the import-boundaries Edge Function
   */
  const handleImportBoundaries = async () => {
    try {
      setIsImporting(true);
      setImportProgress({
        status: 'downloading',
        message: 'Starting boundary import...',
        progress: 0,
      });

      // Call Edge Function to start import
      const { data, error } = await supabase.functions.invoke('import-boundaries', {
        body: {
          region: 'nigeria',
          adminLevels: [4, 6], // States and LGAs only (skip Wards for now)
          countryId: DEFAULT_COUNTRY_NIGERIA_ID,
          workspaceId: DEFAULT_WORKSPACE_KANO_PHARMA_ID,
        },
      });

      if (error) throw error;

      const { jobId } = data;

      toast.info('Import Started', {
        description: 'Downloading and importing OSM boundaries. This may take a few minutes.',
      });

      // Subscribe to realtime progress updates
      const channel = supabase.channel(`boundary-import:${jobId}`);

      channel
        .on('broadcast', { event: 'progress' }, ({ payload }) => {
          setImportProgress(payload);

          if (payload.status === 'complete') {
            toast.success('Import Complete', {
              description: `Successfully imported ${payload.importedBoundaries} admin boundaries`,
            });
            setIsImporting(false);
            channel.unsubscribe();
          } else if (payload.status === 'error') {
            toast.error('Import Failed', {
              description: payload.error || 'Unknown error occurred',
            });
            setIsImporting(false);
            channel.unsubscribe();
          }
        })
        .subscribe();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setIsImporting(false);
      setImportProgress({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
      });
    }
  };

  /**
   * Render import status badge
   */
  const renderStatusBadge = () => {
    const { status } = importProgress;

    if (status === 'idle') return null;

    const statusConfig = {
      downloading: { label: 'Downloading', variant: 'default' as const, icon: Download },
      parsing: { label: 'Parsing', variant: 'default' as const, icon: RefreshCw },
      importing: { label: 'Importing', variant: 'default' as const, icon: MapPin },
      complete: { label: 'Complete', variant: 'success' as const, icon: CheckCircle },
      error: { label: 'Error', variant: 'destructive' as const, icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.downloading;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Location Management</h1>
          <p className="text-muted-foreground">
            Manage administrative boundaries, states, LGAs, and geographic data
          </p>
        </div>
      </div>

      <Tabs defaultValue="boundaries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="boundaries">Admin Boundaries</TabsTrigger>
          <TabsTrigger value="lgas">LGAs</TabsTrigger>
          <TabsTrigger value="import">Import from OSM</TabsTrigger>
        </TabsList>

        {/* Admin Boundaries Tab */}
        <TabsContent value="boundaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Administrative Boundaries</CardTitle>
              <CardDescription>
                View and manage states, LGAs, and wards from OpenStreetMap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Admin boundaries are sourced from OpenStreetMap via Geofabrik.
                  Use the "Import from OSM" tab to download the latest boundaries.
                </AlertDescription>
              </Alert>

              {/* TODO: Add table/list of admin boundaries */}
              <div className="mt-4 text-sm text-muted-foreground">
                Boundary list will be displayed here after import
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LGAs Tab */}
        <TabsContent value="lgas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Local Government Areas (LGAs)</CardTitle>
                  <CardDescription>
                    Manually manage LGAs - admin-only creation
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add LGA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  LGAs can only be created by administrators. Users cannot auto-create LGAs during facility import.
                  If a facility CSV contains an unknown LGA, users will see "Contact admin to add this LGA".
                </AlertDescription>
              </Alert>

              {/* TODO: Add table/list of LGAs */}
              <div className="text-sm text-muted-foreground">
                LGA list will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import from OSM Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Boundaries from OpenStreetMap</CardTitle>
              <CardDescription>
                Download and import administrative boundaries from Geofabrik (manual process)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  This process downloads OpenStreetMap boundaries for Nigeria from Geofabrik.
                  It includes States (admin_level=4) and LGAs (admin_level=6).
                  The download is approximately 300MB and import may take 5-10 minutes.
                </AlertDescription>
              </Alert>

              {/* Import Progress */}
              {importProgress.status !== 'idle' && (
                <div className="space-y-2 p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Import Status</span>
                    {renderStatusBadge()}
                  </div>

                  <Progress value={importProgress.progress} className="h-2" />

                  <p className="text-sm text-muted-foreground">
                    {importProgress.message}
                  </p>

                  {importProgress.totalBoundaries && (
                    <p className="text-xs text-muted-foreground">
                      {importProgress.importedBoundaries || 0} / {importProgress.totalBoundaries} boundaries imported
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
                  disabled={isImporting}
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
                      Import Nigeria Boundaries
                    </>
                  )}
                </Button>

                {importProgress.status === 'complete' && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Last import successful
                  </Badge>
                )}
              </div>

              {/* Import Details */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Source:</strong> Geofabrik (https://download.geofabrik.de/africa/nigeria)</p>
                <p><strong>Data:</strong> States (36 + FCT) and LGAs (774)</p>
                <p><strong>Update Frequency:</strong> Daily (Geofabrik updates)</p>
                <p><strong>License:</strong> OpenStreetMap ODbL</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
