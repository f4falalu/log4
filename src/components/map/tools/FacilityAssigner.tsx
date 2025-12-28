/**
 * FacilityAssigner Component
 *
 * Allows planners to assign facilities to service zones
 *
 * Features:
 * - Facility list with search and filter
 * - Zone selection
 * - Drag-and-drop or click-based assignment
 * - Batch assignment operations
 * - Save to facility_assignments table (active=false by default)
 *
 * Workflow: Select facilities → Choose zone → Assign → Save as draft
 */

import { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, X, Search, Check, AlertCircle } from 'lucide-react';
import { useFacilities } from '@/hooks/useFacilities';
import { useServiceZones } from '@/hooks/useServiceZones';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FacilityAssignerProps {
  active: boolean;
  onClose: () => void;
}

export function FacilityAssigner({ active, onClose }: FacilityAssignerProps) {
  const { facilities, loading: facilitiesLoading } = useFacilities();
  const { data: zones = [], isLoading: zonesLoading } = useServiceZones();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<Set<string>>(new Set());
  const [assignmentType, setAssignmentType] = useState<'primary' | 'secondary' | 'backup'>(
    'primary'
  );
  const [saving, setSaving] = useState(false);

  // Filter facilities based on search query
  const filteredFacilities = useMemo(() => {
    if (!searchQuery) return facilities;

    const lowerQuery = searchQuery.toLowerCase();
    return facilities.filter(
      (facility) =>
        facility.name.toLowerCase().includes(lowerQuery) ||
        facility.address?.toLowerCase().includes(lowerQuery) ||
        facility.state?.toLowerCase().includes(lowerQuery)
    );
  }, [facilities, searchQuery]);

  // Toggle facility selection
  const toggleFacilitySelection = useCallback((facilityId: string) => {
    setSelectedFacilityIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(facilityId)) {
        newSet.delete(facilityId);
      } else {
        newSet.add(facilityId);
      }
      return newSet;
    });
  }, []);

  // Select all filtered facilities
  const selectAllFiltered = useCallback(() => {
    setSelectedFacilityIds(new Set(filteredFacilities.map((f) => f.id)));
  }, [filteredFacilities]);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedFacilityIds(new Set());
  }, []);

  // Save assignments to database
  const handleSaveAssignments = useCallback(async () => {
    if (!selectedZoneId) {
      toast.error('Please select a zone');
      return;
    }

    if (selectedFacilityIds.size === 0) {
      toast.error('Please select at least one facility');
      return;
    }

    try {
      setSaving(true);

      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get workspace_id (using first available zone's workspace or mock workspace)
      // TODO: Get actual workspace_id from context when workspace system is implemented
      const workspaceId = '00000000-0000-0000-0000-000000000000'; // Mock workspace ID

      // Create facility assignments
      const assignments = Array.from(selectedFacilityIds).map((facilityId) => ({
        workspace_id: workspaceId,
        facility_id: facilityId,
        zone_configuration_id: selectedZoneId,
        assignment_type: assignmentType,
        priority: assignmentType === 'primary' ? 1 : assignmentType === 'secondary' ? 2 : 3,
        active: false, // DRAFT by default
        created_by: user.id,
      }));

      const { error } = await supabase.from('facility_assignments').insert(assignments);

      if (error) throw error;

      toast.success(
        `Successfully assigned ${selectedFacilityIds.size} facilities to zone (draft mode - requires activation)`
      );

      // Clear selections
      clearSelections();
      setSelectedZoneId('');
    } catch (error) {
      console.error('Error saving facility assignments:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save facility assignments'
      );
    } finally {
      setSaving(false);
    }
  }, [selectedZoneId, selectedFacilityIds, assignmentType, clearSelections]);

  if (!active) return null;

  return (
    <Card className="absolute top-24 right-4 z-[1000] p-4 w-96 bg-card/95 backdrop-blur-sm max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-green-600" />
          <h3 className="font-semibold text-sm">Facility Assigner</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Zone Selection */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs font-medium">Target Zone</Label>
        <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a zone..." />
          </SelectTrigger>
          <SelectContent>
            {zonesLoading ? (
              <SelectItem value="loading" disabled>
                Loading zones...
              </SelectItem>
            ) : zones.length === 0 ? (
              <SelectItem value="none" disabled>
                No zones available
              </SelectItem>
            ) : (
              zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Assignment Type */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs font-medium">Assignment Type</Label>
        <Select value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="backup">Backup</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search facilities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">
          {selectedFacilityIds.size} selected
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllFiltered}>
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearSelections}
            disabled={selectedFacilityIds.size === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Facilities List */}
      <ScrollArea className="flex-1 -mx-4 px-4 mb-4">
        <div className="space-y-2">
          {facilitiesLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading facilities...
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {searchQuery ? 'No facilities found' : 'No facilities available'}
            </div>
          ) : (
            filteredFacilities.map((facility) => (
              <div
                key={facility.id}
                className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                  selectedFacilityIds.has(facility.id)
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-background border-border hover:bg-accent'
                }`}
                onClick={() => toggleFacilitySelection(facility.id)}
              >
                <Checkbox
                  checked={selectedFacilityIds.has(facility.id)}
                  onCheckedChange={() => toggleFacilitySelection(facility.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{facility.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {facility.address}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {facility.state && (
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                        {facility.state}
                      </span>
                    )}
                    {facility.type && (
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                        {facility.type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Draft Reminder */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2 mb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Assignments are saved as drafts (active=false) and require activation to take effect
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSaveAssignments}
          disabled={!selectedZoneId || selectedFacilityIds.size === 0 || saving}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Assign'}
        </Button>
      </div>
    </Card>
  );
}
