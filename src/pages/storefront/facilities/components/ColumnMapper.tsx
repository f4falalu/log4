import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, AlertCircle, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFacilityTypes } from '@/hooks/useFacilityTypes';
import { useLevelsOfCare } from '@/hooks/useLevelsOfCare';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useLGAs } from '@/hooks/useLGAs';
import { fuzzyMatch } from '@/lib/fuzzy-match';
import type { SkipConfig } from '@/lib/file-import';

export interface ColumnMapping {
  [expectedField: string]: string; // Maps expected field name to CSV column header
}

export interface ColumnMapperResult {
  mappings: ColumnMapping;
  skipConfig: SkipConfig;
  autoGenerateWarehouseCode: boolean;
}

interface ColumnMapperProps {
  csvHeaders: string[];
  autoDetectedMappings: ColumnMapping;
  sampleRow?: any; // First row of data for preview
  onMappingsConfirmed: (result: ColumnMapperResult) => void;
  onBack: () => void;
}

interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  description?: string;
  skipAllowed?: boolean;
  dbLinked?: boolean;
}

const REQUIRED_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Facility Name', required: true, description: 'Unique name of the facility' },
  { key: 'address', label: 'Address', required: true, description: 'Physical location address' },
  { key: 'latitude', label: 'Latitude', required: true, description: 'GPS latitude coordinate' },
  { key: 'longitude', label: 'Longitude', required: true, description: 'GPS longitude coordinate' },
  { key: 'lga', label: 'LGA (Local Government Area)', required: true, description: 'Must match database LGAs', dbLinked: true },
];

const OPTIONAL_FIELDS: FieldDefinition[] = [
  { key: 'ward', label: 'Ward', required: false, skipAllowed: true, description: 'Political ward or locality' },
  { key: 'service_zone', label: 'Service Zone', required: false, skipAllowed: true, description: 'Operational service zone', dbLinked: true },
  { key: 'level_of_care', label: 'Level of Care', required: false, skipAllowed: true, description: 'Primary, Secondary, or Tertiary', dbLinked: true },
  { key: 'type', label: 'Facility Type', required: false, skipAllowed: true, description: 'Hospital, Clinic, Health Center, etc.', dbLinked: true },
  { key: 'state', label: 'State', required: false, skipAllowed: true },
  { key: 'warehouse_code', label: 'Warehouse Code', required: false, skipAllowed: true, description: 'Can be auto-generated' },
];

export function ColumnMapper({
  csvHeaders,
  autoDetectedMappings,
  sampleRow,
  onMappingsConfirmed,
  onBack,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<ColumnMapping>(autoDetectedMappings);
  const [skipConfig, setSkipConfig] = useState<SkipConfig>({});
  const [autoGenerateWarehouseCode, setAutoGenerateWarehouseCode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch DB data for validation
  const { data: facilityTypes = [] } = useFacilityTypes();
  const { data: levelsOfCare = [] } = useLevelsOfCare();
  const { data: zones = [] } = useOperationalZones();
  const { data: lgas = [] } = useLGAs();

  // Validate that all required fields are mapped
  useEffect(() => {
    const unmappedRequired = REQUIRED_FIELDS.filter(field => !mappings[field.key]);

    if (unmappedRequired.length > 0) {
      setValidationError(
        `Please map all required fields: ${unmappedRequired.map(f => f.label).join(', ')}`
      );
    } else {
      setValidationError(null);
    }
  }, [mappings]);

  const handleMappingChange = (fieldKey: string, csvHeader: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldKey]: csvHeader === '__NONE__' ? '' : csvHeader,
    }));
  };

  const handleSkipChange = (fieldKey: string, checked: boolean) => {
    setSkipConfig(prev => ({
      ...prev,
      [fieldKey]: checked,
    }));
  };

  const handleConfirm = () => {
    if (validationError) return;
    onMappingsConfirmed({
      mappings,
      skipConfig,
      autoGenerateWarehouseCode,
    });
  };

  /**
   * Get confidence badge for DB-linked fields
   */
  const getConfidenceBadge = (field: FieldDefinition, sampleValue: any) => {
    if (!field.dbLinked || !sampleValue) return null;

    let match = null;
    let matchType = 'none';

    if (field.key === 'lga') {
      match = fuzzyMatch(String(sampleValue), lgas, 0.65, (lga) => lga.name);
      matchType = 'LGA';
    } else if (field.key === 'service_zone') {
      match = fuzzyMatch(String(sampleValue), zones, 0.65, (zone) => zone.name);
      matchType = 'Zone';
    } else if (field.key === 'level_of_care') {
      match = fuzzyMatch(String(sampleValue), levelsOfCare, 0.65, (level) => level.name);
      matchType = 'Level';
    } else if (field.key === 'type') {
      match = fuzzyMatch(String(sampleValue), facilityTypes, 0.65, (type) => type.name);
      matchType = 'Type';
    }

    if (!match) {
      const message = field.key === 'lga'
        ? 'Contact admin to add LGA'
        : `${matchType} not in DB`;

      return (
        <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          {message}
        </Badge>
      );
    }

    if (match.isExact) {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Exact match
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Fuzzy match ({Math.round(match.score * 100)}%)
      </Badge>
    );
  };

  const renderFieldMapper = (field: FieldDefinition) => {
    const isMapped = !!mappings[field.key];
    const isSkipped = skipConfig[field.key as keyof SkipConfig];
    const mappedHeader = mappings[field.key];
    const isWarehouseCode = field.key === 'warehouse_code';

    // Get sample value from the mapped column
    const sampleValue = mappedHeader && sampleRow ? sampleRow[mappedHeader] : null;

    // Get confidence badge for DB-linked fields
    const confidenceBadge = isMapped ? getConfidenceBadge(field, sampleValue) : null;

    return (
      <div key={field.key} className="space-y-2 p-3 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <Label htmlFor={`map-${field.key}`} className="flex items-center gap-2">
            {isMapped ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <span className="font-medium">{field.label}</span>
            {field.required && <span className="text-destructive text-xs">*</span>}
          </Label>
          <div className="flex items-center gap-2">
            {confidenceBadge}
            {isMapped && (
              <span className="text-xs text-muted-foreground">
                → {mappedHeader}
              </span>
            )}
          </div>
        </div>

        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}

        {/* Warehouse code auto-generate override */}
        {isWarehouseCode && autoGenerateWarehouseCode && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <Info className="h-3 w-3" />
            <span>Auto-generate enabled. CSV column will be ignored.</span>
          </div>
        )}

        <Select
          value={mappedHeader || '__NONE__'}
          onValueChange={(value) => handleMappingChange(field.key, value)}
          disabled={isWarehouseCode && autoGenerateWarehouseCode}
        >
          <SelectTrigger
            id={`map-${field.key}`}
            className={!isMapped && field.required ? 'border-destructive' : ''}
          >
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__NONE__">
              <span className="text-muted-foreground">Not in file</span>
            </SelectItem>
            {csvHeaders.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sample value display */}
        {sampleValue && !isSkipped && (
          <div className="text-xs bg-muted/50 px-2 py-1 rounded">
            <span className="font-medium text-muted-foreground">Sample:</span>{' '}
            <span className="text-foreground">
              {String(sampleValue).substring(0, 50)}
              {String(sampleValue).length > 50 ? '...' : ''}
            </span>
          </div>
        )}

        {/* Skip checkbox for optional fields */}
        {field.skipAllowed && (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`skip-${field.key}`}
              checked={isSkipped}
              onCheckedChange={(checked) => handleSkipChange(field.key, checked as boolean)}
            />
            <Label
              htmlFor={`skip-${field.key}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Skip this field (set to NULL, can be filled later)
            </Label>
          </div>
        )}
      </div>
    );
  };

  const requiredMappedCount = REQUIRED_FIELDS.filter(f => mappings[f.key]).length;
  const optionalMappedCount = OPTIONAL_FIELDS.filter(f => mappings[f.key]).length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Map CSV Columns to Expected Fields</AlertTitle>
        <AlertDescription>
          <p className="text-sm mt-1">
            Your CSV has {csvHeaders.length} columns. Please map them to the expected facility fields below.
          </p>
          <div className="flex gap-4 mt-2">
            <span className="text-xs font-medium">
              Required: {requiredMappedCount}/{REQUIRED_FIELDS.length}
            </span>
            <span className="text-xs text-muted-foreground">
              Optional: {optionalMappedCount}/{OPTIONAL_FIELDS.length}
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Required Fields */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Required Fields
        </h3>
        <div className="space-y-3">
          {REQUIRED_FIELDS.map(renderFieldMapper)}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          Optional Fields
        </h3>
        <div className="space-y-3">
          {OPTIONAL_FIELDS.map(renderFieldMapper)}
        </div>
      </div>

      {/* Warehouse Code Auto-Generate */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
          <Checkbox
            id="auto-warehouse-code"
            checked={autoGenerateWarehouseCode}
            onCheckedChange={(checked) => setAutoGenerateWarehouseCode(checked as boolean)}
          />
          <div className="flex-1">
            <Label htmlFor="auto-warehouse-code" className="cursor-pointer font-medium">
              Auto-generate Warehouse Codes
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              If checked, warehouse codes will be automatically generated for all facilities using the pattern{' '}
              <code className="bg-muted px-1 py-0.5 rounded">PSM/KAN/{'{zone}'}/{'{xxx}'}</code>.
              Any existing warehouse codes in your CSV will be ignored.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Upload
        </Button>
        <Button onClick={handleConfirm} disabled={!!validationError}>
          <ArrowRight className="h-4 w-4 mr-2" />
          Continue to Preview
        </Button>
      </div>
    </div>
  );
}
