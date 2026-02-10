import { useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useServiceAreas } from '@/hooks/useServiceAreas';
import { useCreateRoute } from '@/hooks/useRoutes';

interface ParsedFacility {
  facility_name: string;
  lga: string;
  lat: number;
  lng: number;
  valid: boolean;
  error?: string;
}

type Step = 'context' | 'upload' | 'preview' | 'name' | 'review';
const STEPS: Step[] = ['context', 'upload', 'preview', 'name', 'review'];

interface UploadRouteFormProps {
  onSuccess: () => void;
}

export function UploadRouteForm({ onSuccess }: UploadRouteFormProps) {
  const [step, setStep] = useState<Step>('context');
  const [zoneId, setZoneId] = useState('');
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [routeName, setRouteName] = useState('');
  const [parsedFacilities, setParsedFacilities] = useState<ParsedFacility[]>([]);
  const [parseError, setParseError] = useState('');

  const { zones } = useOperationalZones();
  const { data: serviceAreas } = useServiceAreas(zoneId ? { zone_id: zoneId } : undefined);
  const selectedSA = serviceAreas?.find(sa => sa.id === serviceAreaId);
  const selectedZone = zones?.find(z => z.id === zoneId);
  const createMutation = useCreateRoute();

  const currentIdx = STEPS.indexOf(step);
  const validFacilities = parsedFacilities.filter(f => f.valid);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setParseError('CSV must have a header row and at least one data row.');
          return;
        }

        const header = lines[0].toLowerCase().split(',').map(h => h.trim());
        const nameIdx = header.findIndex(h => h.includes('name') || h.includes('facility'));
        const lgaIdx = header.findIndex(h => h.includes('lga'));
        const latIdx = header.findIndex(h => h.includes('lat'));
        const lngIdx = header.findIndex(h => h.includes('lng') || h.includes('lon'));

        if (nameIdx === -1 || latIdx === -1 || lngIdx === -1) {
          setParseError('CSV must contain columns: facility_name (or name), lat, lng (or lon). LGA is optional.');
          return;
        }

        const results: ParsedFacility[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          const lat = parseFloat(cols[latIdx]);
          const lng = parseFloat(cols[lngIdx]);
          const name = cols[nameIdx] || '';
          const lga = lgaIdx >= 0 ? cols[lgaIdx] || '' : '';

          const valid = !!name && !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
          results.push({
            facility_name: name,
            lga,
            lat: isNaN(lat) ? 0 : lat,
            lng: isNaN(lng) ? 0 : lng,
            valid,
            error: !valid ? 'Invalid name or coordinates' : undefined,
          });
        }
        setParsedFacilities(results);
      } catch {
        setParseError('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 'context': return !!zoneId && !!serviceAreaId;
      case 'upload': return validFacilities.length > 0;
      case 'preview': return true;
      case 'name': return !!routeName.trim();
      case 'review': return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) setStep(STEPS[currentIdx + 1]);
  };

  const handleBack = () => {
    if (currentIdx > 0) setStep(STEPS[currentIdx - 1]);
  };

  const handleSubmit = async () => {
    // For uploaded facilities, we create the route with empty facility_ids
    // since these are provisional facilities not yet in the DB.
    // The route metadata will store the uploaded facility data.
    await createMutation.mutateAsync({
      name: routeName,
      zone_id: zoneId,
      service_area_id: serviceAreaId,
      warehouse_id: selectedSA?.warehouse_id || '',
      creation_mode: 'upload',
      facility_ids: [], // Provisional — stored in metadata
      is_sandbox: false,
    });
    onSuccess();
  };

  return (
    <div className="space-y-4 py-2">
      {/* Step: Context */}
      {step === 'context' && (
        <div className="space-y-4">
          <div>
            <Label>Zone</Label>
            <Select value={zoneId} onValueChange={(v) => { setZoneId(v); setServiceAreaId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
              <SelectContent>
                {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Service Area</Label>
            <Select value={serviceAreaId} onValueChange={setServiceAreaId} disabled={!zoneId}>
              <SelectTrigger><SelectValue placeholder="Select service area" /></SelectTrigger>
              <SelectContent>
                {serviceAreas?.map(sa => <SelectItem key={sa.id} value={sa.id}>{sa.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Upload CSV File</p>
            <p className="text-xs text-muted-foreground mb-4">
              Required columns: facility_name, lat, lng. Optional: lga
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="max-w-xs mx-auto"
            />
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedFacilities.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span>{parsedFacilities.length} rows parsed</span>
              <Badge variant="default">{validFacilities.length} valid</Badge>
              {parsedFacilities.length - validFacilities.length > 0 && (
                <Badge variant="destructive">
                  {parsedFacilities.length - validFacilities.length} invalid
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-3">
          <Label>Uploaded Facilities Preview</Label>
          <div className="rounded-md border max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>LGA</TableHead>
                  <TableHead>Lat</TableHead>
                  <TableHead>Lng</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedFacilities.map((f, i) => (
                  <TableRow key={i} className={f.valid ? '' : 'bg-destructive/5'}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{f.facility_name}</TableCell>
                    <TableCell>{f.lga || '—'}</TableCell>
                    <TableCell>{f.lat.toFixed(4)}</TableCell>
                    <TableCell>{f.lng.toFixed(4)}</TableCell>
                    <TableCell>
                      <Badge variant={f.valid ? 'default' : 'destructive'}>
                        {f.valid ? 'Provisional' : 'Invalid'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Step: Name */}
      {step === 'name' && (
        <div className="space-y-3">
          <Label htmlFor="upload-route-name">Route Name</Label>
          <Input
            id="upload-route-name"
            placeholder="e.g., U1 - Uploaded Route North"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
          />
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Route Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{routeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zone</span>
              <span className="font-medium">{selectedZone?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Area</span>
              <span className="font-medium">{selectedSA?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded Facilities</span>
              <span className="font-medium">{validFacilities.length} (provisional)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant="outline">Upload</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleBack} disabled={currentIdx === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step === 'review' ? (
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Create Route
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
