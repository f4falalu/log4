import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useServiceAreas } from '@/hooks/useServiceAreas';
import { useCreateRoute } from '@/hooks/useRoutes';
import { supabase } from '@/integrations/supabase/client';
import {
  applyManualMappings,
  getValidationSummary,
  parseFile,
  validateParsedData,
  type ParsedFile,
} from '@/lib/file-import';
import { ColumnMapper, type ColumnMapperResult } from '@/pages/storefront/facilities/components/ColumnMapper';
import { calculateDistance } from '@/lib/routeOptimization';
import { computeDistanceMatrix, type GeoPoint } from '@/lib/algorithms/distanceMatrix';
import { solveTSP } from '@/lib/algorithms/tsp';
import { LeftColumn, MiddleColumn, RightColumn, ThreeColumnLayout } from '@/components/unified-workflow/schedule/ThreeColumnLayout';
import { MAP_CONFIG, getMapLibreStyle } from '@/lib/mapConfig';
import { useTheme } from 'next-themes';

const ACCEPTED_FILE_TYPES = '.csv,.xlsx,.xls';

interface ProvisionalFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lga?: string;
  address?: string;
  warehouse_code?: string;
  service_zone?: string;
}

type Step = 'upload' | 'mapping' | 'preview' | 'builder';
const STEPS: Step[] = ['upload', 'mapping', 'preview', 'builder'];

interface UploadRouteFormProps {
  onSuccess: () => void;
}

export function UploadRouteForm({ onSuccess }: UploadRouteFormProps) {
  const [step, setStep] = useState<Step>('upload');
  const [zoneId, setZoneId] = useState('');
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [routeName, setRouteName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [upsertPending, setUpsertPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optimizedOrder, setOptimizedOrder] = useState<string[] | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { theme } = useTheme();
  const { zones } = useOperationalZones();
  const { data: serviceAreas } = useServiceAreas(zoneId ? { zone_id: zoneId } : undefined);
  const selectedSA = serviceAreas?.find(sa => sa.id === serviceAreaId);
  const selectedZone = zones?.find(z => z.id === zoneId);
  const createMutation = useCreateRoute();

  const currentIdx = STEPS.indexOf(step);
  const facilities: ProvisionalFacility[] = useMemo(() => {
    if (!parsedData) return [];
    const list: ProvisionalFacility[] = [];
    parsedData.rows.forEach((row: any, idx: number) => {
      const name = String(row.name || '').trim();
      const lat = parseFloat(String(row.latitude ?? ''));
      const lng = parseFloat(String(row.longitude ?? ''));
      if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return;
      list.push({
        id: `${idx}`, // stable enough for a provisional list
        name,
        lat,
        lng,
        lga: row.lga ? String(row.lga).trim() : undefined,
        address: row.address ? String(row.address).trim() : undefined,
        warehouse_code: row.warehouse_code ? String(row.warehouse_code).trim() : undefined,
        service_zone: row.service_zone ? String(row.service_zone).trim() : undefined,
      });
    });
    return list;
  }, [parsedData]);

  const selectedFacilities = useMemo(() => {
    const order = optimizedOrder || selectedIds;
    const map = new Map(facilities.map((f) => [f.id, f] as const));
    return order.map((id) => map.get(id)).filter((f): f is ProvisionalFacility => !!f);
  }, [facilities, optimizedOrder, selectedIds]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target?.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);
    try {
      const parsed = await parseFile(selectedFile);
      setParsedData(parsed);
      setStep('mapping');
    } catch (err: any) {
      setParseError(err?.message || 'Failed to parse file');
      setFile(null);
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMappingsConfirmed = (result: ColumnMapperResult) => {
    if (!parsedData) return;

    const mappedData = applyManualMappings(parsedData, result.mappings);
    setParsedData(mappedData);
    setStep('preview');
  };

  const validationSummary = useMemo(() => {
    if (!parsedData) return null;
    const issues = validateParsedData(parsedData);
    return getValidationSummary(issues);
  }, [parsedData]);

  const handleOptimize = () => {
    if (selectedIds.length < 2) return;
    setIsOptimizing(true);
    setTimeout(() => {
      try {
        const map = new Map(facilities.map((f) => [f.id, f] as const));
        const points: GeoPoint[] = selectedIds
          .map((id) => map.get(id))
          .filter((f): f is ProvisionalFacility => !!f)
          .map((f) => ({ id: f.id, lat: f.lat, lng: f.lng }));
        if (points.length < 2) return;
        const distMatrix = computeDistanceMatrix(points);
        const result = solveTSP(distMatrix, 0);
        const newOrder = result.order.map((idx) => points[idx].id);
        setOptimizedOrder(newOrder);
        setSelectedIds(newOrder);
      } finally {
        setIsOptimizing(false);
      }
    }, 10);
  };

  const insights = useMemo(() => {
    if (selectedFacilities.length === 0) {
      return { count: 0, totalDistanceKm: 0 };
    }
    let totalDistanceKm = 0;
    for (let i = 1; i < selectedFacilities.length; i++) {
      const a = selectedFacilities[i - 1];
      const b = selectedFacilities[i];
      totalDistanceKm += calculateDistance(a.lat, a.lng, b.lat, b.lng);
    }
    return {
      count: selectedFacilities.length,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    };
  }, [selectedFacilities]);

  const canProceed = (): boolean => {
    switch (step) {
      case 'upload':
        return !!file;
      case 'mapping':
        return !!parsedData;
      case 'preview':
        return (validationSummary?.errors || 0) === 0 && facilities.length > 0;
      case 'builder':
        return !!zoneId && !!serviceAreaId && !!routeName.trim() && selectedIds.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) setStep(STEPS[currentIdx + 1]);
  };

  const handleBack = () => {
    if (currentIdx > 0) setStep(STEPS[currentIdx - 1]);
  };

  const handleSubmit = async () => {
    const uploadedFacilities = selectedFacilities.map((f) => ({
      facility_name: f.name,
      lga: f.lga,
      lat: f.lat,
      lng: f.lng,
      warehouse_code: f.warehouse_code,
      service_zone: f.service_zone,
      address: f.address,
    }));
    await createMutation.mutateAsync({
      name: routeName,
      zone_id: zoneId,
      service_area_id: serviceAreaId,
      warehouse_id: selectedSA?.warehouse_id || '',
      creation_mode: 'upload',
      facility_ids: [], // Provisional — stored in metadata
      is_sandbox: false,
      metadata: {
        uploaded_facilities: uploadedFacilities,
      },
    });
    onSuccess();
  };

  const handleUpsertToDb = async () => {
    if (selectedFacilities.length === 0) return;
    setUpsertPending(true);
    try {
      const withCode = selectedFacilities.filter((f) => !!f.warehouse_code);
      const withoutCode = selectedFacilities.filter((f) => !f.warehouse_code);

      if (withCode.length > 0) {
        const rows = withCode.map((f) => ({
          name: f.name,
          address: f.address ?? null,
          lat: f.lat,
          lng: f.lng,
          lga: f.lga ?? null,
          service_zone: f.service_zone ?? null,
          warehouse_code: f.warehouse_code ?? null,
          zone_id: zoneId || null,
        }));
        const { error } = await supabase
          .from('facilities')
          .upsert(rows, { onConflict: 'warehouse_code' });
        if (error) throw error;
      }

      if (withoutCode.length > 0) {
        const rows = withoutCode.map((f) => ({
          name: f.name,
          address: f.address ?? null,
          lat: f.lat,
          lng: f.lng,
          lga: f.lga ?? null,
          service_zone: f.service_zone ?? null,
          warehouse_code: null,
          zone_id: zoneId || null,
        }));
        const { error } = await supabase
          .from('facilities')
          .insert(rows);
        if (error) throw error;
      }
    } finally {
      setUpsertPending(false);
    }
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (step !== 'builder') return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme as any),
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [step, theme]);

  useEffect(() => {
    if (step !== 'builder') return;
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const bounds = new maplibregl.LngLatBounds();
    let any = false;

    facilities.forEach((f) => {
      const isSelected = selectedIds.includes(f.id);
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          width: 26px; height: 26px;
          background: ${isSelected ? '#10b981' : '#6b7280'};
          border: 2px solid ${isSelected ? '#059669' : '#9ca3af'};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          color: white; font-size: 11px; font-weight: 700;
          opacity: ${isSelected ? 1 : 0.35};
        ">${isSelected ? (selectedIds.indexOf(f.id) + 1) : ''}</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([f.lng, f.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
            `<div style="padding:4px;min-width:140px;"><strong>${f.name}</strong><div style="font-size:12px;color:#666;">${f.lga || 'Unknown LGA'}</div></div>`
          )
        )
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        marker.togglePopup();
      });

      markersRef.current.set(f.id, marker);
      bounds.extend([f.lng, f.lat]);
      any = true;
    });

    if (any) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [facilities, selectedIds, step]);

  return (
    <div className="space-y-4 py-2">
      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Upload Facilities</p>
            <p className="text-xs text-muted-foreground mb-4">
              Supported formats: CSV (.csv), Excel (.xlsx, .xls)
            </p>
            <Input
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              disabled={isParsing}
              className="max-w-xs mx-auto"
            />
            {isParsing && (
              <div className="flex items-center justify-center mt-3 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing file...
              </div>
            )}
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedData && (
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              <span>{parsedData.rows.length} rows found</span>
            </div>
          )}
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && parsedData && (
        <ColumnMapper
          csvHeaders={parsedData.headers}
          autoDetectedMappings={Object.fromEntries(
            (parsedData.columnMappings || [])
              .filter((m) => m.isRecognized && m.mappedTo)
              .map((m) => [m.mappedTo as string, m.originalHeader])
          )}
          sampleRow={parsedData.rows[0]}
          onMappingsConfirmed={handleMappingsConfirmed}
          onBack={() => setStep('upload')}
        />
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rows parsed</span>
                <span className="font-medium">{parsedData?.rows.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valid facilities</span>
                <span className="font-medium">{facilities.length}</span>
              </div>
              {validationSummary && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Validation</span>
                  <div className="flex items-center gap-2">
                    {validationSummary.errors > 0 && (
                      <Badge variant="destructive">{validationSummary.errors} errors</Badge>
                    )}
                    {validationSummary.warnings > 0 && (
                      <Badge variant="secondary">{validationSummary.warnings} warnings</Badge>
                    )}
                    {validationSummary.errors === 0 && (
                      <Badge variant="default">OK</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {validationSummary?.errors ? (
            <Alert variant="destructive">
              <AlertDescription>
                Fix the mapped columns / data first. Errors must be 0 to continue.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      {/* Step: Builder */}
      {step === 'builder' && (
        <div className="space-y-4">
          <ThreeColumnLayout className="min-h-[600px]">
            <LeftColumn title="Map" subtitle="Selected facilities are highlighted">
              <div className="h-[520px] w-full overflow-hidden rounded-md border bg-background">
                <div ref={mapContainerRef} className="h-full w-full" />
              </div>
            </LeftColumn>

            <MiddleColumn
              title={`Facilities (${selectedIds.length} selected)`}
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const all = facilities.map((f) => f.id);
                      setSelectedIds((prev) => (prev.length === all.length ? [] : all));
                      setOptimizedOrder(null);
                    }}
                  >
                    {selectedIds.length === facilities.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOptimize}
                    disabled={isOptimizing || selectedIds.length < 2}
                  >
                    {isOptimizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Optimize'
                    )}
                  </Button>
                </div>
              }
            >
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {facilities.map((f) => {
                    const isSelected = selectedIds.includes(f.id);
                    const visitIndex = optimizedOrder ? (optimizedOrder.indexOf(f.id) + 1) : (selectedIds.indexOf(f.id) + 1);
                    return (
                      <div
                        key={f.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50 border-border'
                        }`}
                        onClick={() => {
                          setSelectedIds((prev) =>
                            prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                          );
                          setOptimizedOrder(null);
                        }}
                      >
                        <div className="w-6 text-xs text-muted-foreground font-mono text-right mt-0.5">
                          {isSelected ? visitIndex : ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {f.lga || 'Unknown LGA'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </MiddleColumn>

            <RightColumn
              title="Insights"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpsertToDb}
                  disabled={upsertPending || selectedFacilities.length === 0 || !zoneId}
                >
                  {upsertPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upsert to DB'}
                </Button>
              }
            >
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Zone</Label>
                  <Select value={zoneId} onValueChange={(v) => { setZoneId(v); setServiceAreaId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                    <SelectContent>
                      {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Service Area</Label>
                  <Select value={serviceAreaId} onValueChange={setServiceAreaId} disabled={!zoneId}>
                    <SelectTrigger><SelectValue placeholder="Select service area" /></SelectTrigger>
                    <SelectContent>
                      {serviceAreas?.map(sa => <SelectItem key={sa.id} value={sa.id}>{sa.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload-route-name">Route Name</Label>
                  <Input
                    id="upload-route-name"
                    placeholder="e.g., U1 - Uploaded Route"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Selected</span>
                      <span className="font-medium">{insights.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Path distance</span>
                      <span className="font-medium">{insights.totalDistanceKm} km</span>
                    </div>
                    {optimizedOrder && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Optimized</span>
                        <Badge variant="secondary">Yes</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Create Route
                </Button>
              </div>
            </RightColumn>
          </ThreeColumnLayout>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleBack} disabled={currentIdx === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step === 'builder' ? (
          <Button variant="ghost" onClick={onSuccess}>
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
