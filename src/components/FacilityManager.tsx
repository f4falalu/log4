import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Facility, CSVFacility } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { 
  Upload, 
  Building, 
  MapPin, 
  Phone, 
  User,
  Download,
  AlertCircle,
  CheckCircle
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
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Remove the useToast hook declaration

  const validateCSVData = (data: CSVFacility[]): { valid: Facility[]; errors: string[] } => {
    const valid: Facility[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // Account for header row
      
      if (!row.name?.trim()) {
        errors.push(`Row ${rowNum}: Name is required`);
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
      
      if (!row.type?.trim()) {
        errors.push(`Row ${rowNum}: Type is required`);
        return;
      }

      const facility: Facility = {
        id: `facility-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: row.name.trim(),
        address: row.address.trim(),
        lat,
        lng,
        type: row.type.trim(),
        phone: row.phone?.trim() || undefined,
        contactPerson: row.contactPerson?.trim() || undefined,
        capacity: row.capacity ? parseInt(row.capacity) : undefined,
        operatingHours: row.operatingHours?.trim() || undefined,
      };

      valid.push(facility);
    });

    return { valid, errors };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      complete: (results) => {
        try {
          const { valid, errors } = validateCSVData(results.data as CSVFacility[]);
          
          if (valid.length > 0) {
            const updatedFacilities = [...facilities, ...valid];
            onFacilitiesUpdate(updatedFacilities);
            
            toast.success(`Successfully uploaded ${valid.length} facilities`);
          }
          
          setUploadResults({
            success: valid.length,
            errors: errors.slice(0, 10), // Limit errors shown
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
    const template = `name,address,latitude,longitude,type,phone,contactPerson,capacity,operatingHours
"Central Hospital","123 Main St, Anytown, ST 12345",40.7128,-74.0060,"Hospital","(555) 123-4567","John Doe",500,"24/7"
"Pharmacy Plus","456 Oak Ave, Somewhere, ST 67890",41.8781,-87.6298,"Pharmacy","(555) 987-6543","Jane Smith",100,"8AM-10PM"`;
    
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
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div>
              <Label htmlFor="csvFile">Choose CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                ref={fileInputRef}
                className="mt-1"
              />
            </div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </Button>
          </div>

          {uploadResults && (
            <div className="space-y-2">
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