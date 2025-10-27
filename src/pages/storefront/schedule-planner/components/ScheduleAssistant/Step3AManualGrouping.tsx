import { useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFacilities } from '@/hooks/useFacilities';
import { FacilityTable } from './FacilityTable';
import { FacilityMapPreview } from './FacilityMapPreview';
import { BatchAssignmentSidebar } from './BatchAssignmentSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Step3AManualGroupingProps {
  selectedFacilities: string[];
  onFacilitySelect: (facilityIds: string[]) => void;
  onCreateBatch: (batch: any) => void;
}

export function Step3AManualGrouping({
  selectedFacilities,
  onFacilitySelect,
  onCreateBatch,
}: Step3AManualGroupingProps) {
  const { data: facilities = [] } = useFacilities();
  const [showAssignment, setShowAssignment] = useState(false);

  const selectedFacilityData = facilities.filter(f => 
    selectedFacilities.includes(f.id)
  );

  const handleAutoCluster = () => {
    // Simple zone-based clustering
    const grouped = facilities.reduce((acc, facility) => {
      const zone = facility.type || 'default';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(facility.id);
      return acc;
    }, {} as Record<string, string[]>);

    // Select first cluster for demo
    const firstCluster = Object.values(grouped)[0] || [];
    onFacilitySelect(firstCluster);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Build Your Route Manually</h2>
          <p className="text-muted-foreground mt-1">
            Select facilities and assign them to drivers and vehicles
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleAutoCluster}
          className="gap-2"
        >
          <MapPin className="w-4 h-4" />
          Auto Cluster by Zone
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Facility Table */}
        <div className="space-y-4">
          <FacilityTable
            facilities={facilities}
            selectedIds={selectedFacilities}
            onSelectionChange={onFacilitySelect}
          />
          
          {selectedFacilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">{selectedFacilities.length}</span> facilities selected
                  </p>
                  <Button
                    onClick={() => setShowAssignment(true)}
                    className="w-full gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Create Batch & Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Map Preview */}
        <FacilityMapPreview facilities={selectedFacilityData} />
      </div>

      {/* Assignment Sidebar */}
      <BatchAssignmentSidebar
        open={showAssignment}
        onOpenChange={setShowAssignment}
        facilityIds={selectedFacilities}
        onConfirm={(assignment) => {
          onCreateBatch({
            ...assignment,
            facilityIds: selectedFacilities,
          });
          setShowAssignment(false);
          onFacilitySelect([]);
        }}
      />
    </div>
  );
}
