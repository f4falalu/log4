import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Facility, CSVFacility } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { useAddFacility } from '@/hooks/useFacilities';
import { 
  Upload, 
  Building, 
  MapPin, 
  Phone, 
  User,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FacilityManagerProps {
  facilities: Facility[];
  onFacilitiesUpdate: (facilities: Facility[]) => void;
}

const FacilityManager = ({ facilities, onFacilitiesUpdate }: FacilityManagerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    errors: string[];
    columnInfo?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFacility = useAddFacility();

  // Flexible column mapping to handle different CSV formats
  const mapColumns = (row: any): CSVFacility => {
    const mapped: any = {};
    
    // Map name variations
    mapped.name = row.name || row['Facility Name'] || row['facility_name'] || row['Name'];
    
    // Map address variations
    mapped.address = row.address || row['Full Address'] || row['full_address'] || row['Address'];
    
    // Map latitude variations
    mapped.latitude = row.latitude || row['Latitude'] || row['lat'] || row['Lat'];
    
    // Map longitude variations
    mapped.longitude = row.longitude || row['Longitude'] || row['lng'] || row['Lng'] || row['lon'] || row['Lon'];
    
    // Map type variations to valid enum values
    const typeMapping: Record<string, string> = {
      'Healthcare Facility': 'clinic',
      'Health Post': 'health_center',
      'Health Clinic': 'clinic',
      'Medical Center': 'health_center',
      'Primary Health Centre': 'health_center',
      'Hospital': 'hospital',
      'Clinic': 'clinic',
      'Pharmacy': 'pharmacy',
      'Lab': 'lab',
      'Laboratory': 'lab',
      'Other': 'other',
    };
    
    const rawType = row.type || row['Type'] || row['Facility Type'] || row['facility_type'];
    mapped.type = typeMapping[rawType] || rawType?.toLowerCase() || 'clinic';
    
    // Optional fields
    mapped.phone = row.phone || row['Phone'] || row['Phone Number'] || row['phone_number'];
    mapped.contactPerson = row.contactPerson || row['Contact Person'] || row['contact_person'] || row['Contact'];
    mapped.capacity = row.capacity || row['Capacity'];
    mapped.operatingHours = row.operatingHours || row['Operating Hours'] || row['operating_hours'] || row['Hours'];
    
    return mapped as CSVFacility;
  };

  const validateCSVData = (data: any[]): { valid: Facility[]; errors: string[]; columnInfo: string } => {
    const valid: Facility[] = [];
    const errors: string[] = [];
    const validTypes = ['hospital', 'clinic', 'health_center', 'pharmacy', 'lab', 'other'];
    
    // Detect columns for user feedback
    const sampleRow = data[0] || {};
    const detectedColumns = Object.keys(sampleRow);
    const columnInfo = `Detected columns: ${detectedColumns.join(', ')}`;

    data.forEach((rawRow, index) => {
      const rowNum = index + 2; // Account for header row
      const row = mapColumns(rawRow);
      
      if (!row.name?.trim()) {
        errors.push(`Row ${rowNum}: Name is required (found columns: ${Object.keys(rawRow).join(', ')})`);
        return;
      }
      
      if (!row.address?.trim()) {
        errors.push(`Row ${rowNum}: Address is required`);
        return;
      }
      
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push(`Row ${rowNum}: Invalid latitude (${row.latitude})`);
        return;
      }
      
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push(`Row ${rowNum}: Invalid longitude (${row.longitude})`);
        return;
      }

      // Validate facility type
      const facilityType = row.type?.trim().toLowerCase() || 'clinic';
      if (!validTypes.includes(facilityType)) {
        errors.push(`Row ${rowNum}: Invalid facility type "${row.type}". Must be one of: ${validTypes.join(', ')}`);
        return;
      }

      const facility: Facility = {
        id: `facility-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: row.name.trim(),
        address: row.address.trim(),
        lat,
        lng,
        type: facilityType,
        phone: row.phone?.trim() || undefined,
        contactPerson: row.contactPerson?.trim() || undefined,
        capacity: row.capacity ? parseInt(row.capacity) : undefined,
        operatingHours: row.operatingHours?.trim() || undefined,
      };

      valid.push(facility);
    });

    return { valid, errors, columnInfo };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error("Invalid file type. Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    setUploadResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { valid, errors, columnInfo } = validateCSVData(results.data);
          
          if (valid.length > 0) {
            // Upload facilities to database one by one
            let successCount = 0;
            const uploadErrors: string[] = [...errors];
            
            for (const facility of valid) {
              try {
                await addFacility.mutateAsync({
                  name: facility.name,
                  address: facility.address,
                  lat: facility.lat,
                  lng: facility.lng,
                  type: facility.type,
                  phone: facility.phone,
                  contactPerson: facility.contactPerson,
                  capacity: facility.capacity,
                  operatingHours: facility.operatingHours,
                });
                successCount++;
              } catch (error: any) {
                uploadErrors.push(`${facility.name}: ${error.message}`);
              }
            }
            
            if (successCount > 0) {
              toast.success(`Successfully uploaded ${successCount} of ${valid.length} facilities to database`);
            }
          }
          
          setUploadResults({
            success: valid.length,
            errors: errors.slice(0, 10), // Limit errors shown
            columnInfo,
          });
        } catch (error) {
          console.error('CSV processing error:', error);
          toast.error("Failed to process CSV file");
        }
        
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error(`Upload failed: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const template = `Facility Name,Full Address,Latitude,Longitude,Type,Phone,Contact Person,Capacity,Operating Hours
"Central Hospital","123 Main St, Anytown, ST 12345",40.7128,-74.0060,"hospital","(555) 123-4567","John Doe",500,"24/7"
"Pharmacy Plus","456 Oak Ave, Somewhere, ST 67890",41.8781,-87.6298,"pharmacy","(555) 987-6543","Jane Smith",100,"8AM-10PM"
"Community Clinic","789 Pine Rd, Elsewhere, ST 54321",42.3601,-71.0589,"clinic","(555) 456-7890","Bob Johnson",50,"9AM-5PM"
"Health Center","321 Elm St, Anyplace, ST 11111",43.6532,-79.3832,"health_center","(555) 111-2222","Sarah Lee",75,"8AM-6PM"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facility_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-primary" />
            <span>Import Facilities</span>
          </CardTitle>
          <CardDescription>
            Upload facility data via CSV file. Download the template below to see the required format.
            <br />
            <span className="text-xs text-muted-foreground">Valid facility types: hospital, clinic, health_center, pharmacy, lab, other</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="csvFile">Choose CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading || addFacility.isPending}
                ref={fileInputRef}
                className="mt-1"
              />
            </div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Template</span>
                </>
              )}
            </Button>
          </div>

          {uploadResults && (
            <div className="space-y-3">
              {uploadResults.columnInfo && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">{uploadResults.columnInfo}</p>
                </div>
              )}
              
              {uploadResults.success > 0 && (
                <div className="flex items-center space-x-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span>{uploadResults.success} facilities imported successfully</span>
                </div>
              )}
              
              {uploadResults.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>{uploadResults.errors.length} errors found:</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-6 space-y-1">
                    {uploadResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {uploadResults.errors.length === 10 && (
                      <li>... and more errors (first 10 shown)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facilities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-primary" />
            <span>Facilities ({facilities.length})</span>
          </CardTitle>
          <CardDescription>
            View and manage all facilities in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facilities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No facilities found. Upload a CSV file to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell className="font-medium">{facility.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{facility.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{facility.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{facility.lat.toFixed(4)}, {facility.lng.toFixed(4)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {facility.phone && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{facility.phone}</span>
                            </div>
                          )}
                          {facility.contactPerson && (
                            <div className="flex items-center space-x-1 text-sm">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span>{facility.contactPerson}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacilityManager;