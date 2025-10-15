import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import type { Facility } from '@/types';

interface FacilitySelectionOverlayProps {
  facilities: Facility[];
  facilityGroups: Array<{ id: string; name: string; facilities: Facility[] }>;
  selectedGroup: string;
  selectedFacilityIds: string[];
  onGroupChange: (groupId: string) => void;
  onFacilityToggle: (facilityId: string) => void;
  onClear: () => void;
  onOptimize: () => void;
  isOptimizing?: boolean;
}

export function FacilitySelectionOverlay({
  facilities,
  facilityGroups,
  selectedGroup,
  selectedFacilityIds,
  onGroupChange,
  onFacilityToggle,
  onClear,
  onOptimize,
  isOptimizing = false,
}: FacilitySelectionOverlayProps) {
  return (
    <Card className="bg-background/95 backdrop-blur border shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Destinations
        </CardTitle>
        <CardDescription>
          Choose facilities for this delivery batch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Group Selector */}
          <Select value={selectedGroup} onValueChange={onGroupChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {facilityGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.facilities.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Facility List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {facilities.map(facility => (
                <div key={facility.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                  <Checkbox
                    checked={selectedFacilityIds.includes(facility.id)}
                    onCheckedChange={() => onFacilityToggle(facility.id)}
                  />
                  <Label className="flex-1 cursor-pointer">
                    {facility.name}
                    <span className="text-xs text-muted-foreground block">
                      {facility.type}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onOptimize}
              disabled={selectedFacilityIds.length === 0 || isOptimizing}
              className="flex-1"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
            </Button>
            <Button onClick={onClear} variant="outline">
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
