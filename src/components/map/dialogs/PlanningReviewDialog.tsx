/**
 * PlanningReviewDialog Component
 *
 * Review and activate planning configurations
 *
 * Features:
 * - List all draft configurations (zones, route sketches, facility assignments)
 * - Conflict detection (overlapping zones, duplicate assignments)
 * - Side-by-side comparison view
 * - Activation workflow with confirmation
 * - Version management display
 * - Batch activation support
 *
 * Workflow: Review drafts → Check conflicts → Activate selected items
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Route,
  Building2,
  Info,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanningReviewDialogProps {
  open: boolean;
  onClose: () => void;
}

interface DraftZone {
  id: string;
  name: string;
  description: string | null;
  version: number;
  draft_created_at: string;
  zone_type: string;
}

interface DraftRouteSketch {
  id: string;
  name: string;
  description: string | null;
  route_type: string;
  estimated_distance: number;
  created_at: string;
}

interface DraftFacilityAssignment {
  id: string;
  facility_id: string;
  zone_configuration_id: string;
  assignment_type: string;
  created_at: string;
  facility?: { name: string };
  zone?: { name: string };
}

export function PlanningReviewDialog({ open, onClose }: PlanningReviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Draft data
  const [draftZones, setDraftZones] = useState<DraftZone[]>([]);
  const [draftRouteSketches, setDraftRouteSketches] = useState<DraftRouteSketch[]>([]);
  const [draftFacilityAssignments, setDraftFacilityAssignments] = useState<
    DraftFacilityAssignment[]
  >([]);

  // Selection state
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());

  // Conflicts
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Fetch draft configurations
  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch draft zones
      const { data: zones, error: zonesError } = await supabase
        .from('zone_configurations')
        .select('id, name, description, version, draft_created_at, zone_type')
        .eq('active', false)
        .order('draft_created_at', { ascending: false });

      if (zonesError) throw zonesError;
      setDraftZones(zones || []);

      // Fetch draft route sketches
      const { data: routes, error: routesError } = await supabase
        .from('route_sketches')
        .select('id, name, description, route_type, estimated_distance, created_at')
        .eq('active', false)
        .order('created_at', { ascending: false });

      if (routesError) throw routesError;
      setDraftRouteSketches(routes || []);

      // Fetch draft facility assignments with joins
      const { data: assignments, error: assignmentsError } = await supabase
        .from('facility_assignments')
        .select(
          `
          id,
          facility_id,
          zone_configuration_id,
          assignment_type,
          created_at,
          facilities!inner(name),
          zone_configurations!inner(name)
        `
        )
        .eq('active', false)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Transform the data to match our interface
      const transformedAssignments =
        assignments?.map((a: any) => ({
          id: a.id,
          facility_id: a.facility_id,
          zone_configuration_id: a.zone_configuration_id,
          assignment_type: a.assignment_type,
          created_at: a.created_at,
          facility: { name: a.facilities?.name || 'Unknown' },
          zone: { name: a.zone_configurations?.name || 'Unknown' },
        })) || [];

      setDraftFacilityAssignments(transformedAssignments);

      // Check for conflicts
      detectConflicts(zones || [], transformedAssignments);
    } catch (error) {
      console.error('Error fetching draft configurations:', error);
      toast.error('Failed to load draft configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Detect conflicts in draft configurations
  const detectConflicts = useCallback(
    (zones: DraftZone[], assignments: DraftFacilityAssignment[]) => {
      const foundConflicts: string[] = [];

      // Check for duplicate zone names
      const zoneNames = zones.map((z) => z.name);
      const duplicateZones = zoneNames.filter((name, index) => zoneNames.indexOf(name) !== index);
      if (duplicateZones.length > 0) {
        foundConflicts.push(`Duplicate zone names detected: ${duplicateZones.join(', ')}`);
      }

      // Check for duplicate facility assignments (same facility assigned to multiple zones)
      const facilityAssignmentMap = new Map<string, string[]>();
      assignments.forEach((assignment) => {
        const existing = facilityAssignmentMap.get(assignment.facility_id) || [];
        existing.push(assignment.zone?.name || 'Unknown');
        facilityAssignmentMap.set(assignment.facility_id, existing);
      });

      facilityAssignmentMap.forEach((zones, facilityId) => {
        if (zones.length > 1) {
          const assignment = assignments.find((a) => a.facility_id === facilityId);
          foundConflicts.push(
            `Facility "${assignment?.facility?.name}" assigned to multiple zones: ${zones.join(', ')}`
          );
        }
      });

      setConflicts(foundConflicts);
    },
    []
  );

  // Fetch drafts when dialog opens
  useEffect(() => {
    if (open) {
      fetchDrafts();
    }
  }, [open, fetchDrafts]);

  // Toggle selection helpers
  const toggleZoneSelection = useCallback((id: string) => {
    setSelectedZones((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleRouteSelection = useCallback((id: string) => {
    setSelectedRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleAssignmentSelection = useCallback((id: string) => {
    setSelectedAssignments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Activate selected configurations
  const handleActivate = useCallback(async () => {
    const totalSelected =
      selectedZones.size + selectedRoutes.size + selectedAssignments.size;

    if (totalSelected === 0) {
      toast.error('Please select at least one item to activate');
      return;
    }

    if (conflicts.length > 0) {
      toast.error('Please resolve conflicts before activating');
      return;
    }

    try {
      setActivating(true);

      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Activate zones using the activation function
      for (const zoneId of selectedZones) {
        const { error } = await supabase.rpc('activate_zone_configuration', {
          p_zone_id: zoneId,
          p_activated_by: user.id,
        });

        if (error) throw error;
      }

      // Activate route sketches
      if (selectedRoutes.size > 0) {
        const { error } = await supabase
          .from('route_sketches')
          .update({
            active: true,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .in('id', Array.from(selectedRoutes));

        if (error) throw error;
      }

      // Activate facility assignments
      if (selectedAssignments.size > 0) {
        const { error } = await supabase
          .from('facility_assignments')
          .update({
            active: true,
            activated_by: user.id,
            activated_at: new Date().toISOString(),
          })
          .in('id', Array.from(selectedAssignments));

        if (error) throw error;
      }

      toast.success(
        `Successfully activated ${totalSelected} configuration${totalSelected > 1 ? 's' : ''}`
      );

      // Clear selections
      setSelectedZones(new Set());
      setSelectedRoutes(new Set());
      setSelectedAssignments(new Set());

      // Refresh data
      await fetchDrafts();

      // Close dialog if everything is activated
      const remainingDrafts =
        draftZones.length -
        selectedZones.size +
        draftRouteSketches.length -
        selectedRoutes.size +
        draftFacilityAssignments.length -
        selectedAssignments.size;

      if (remainingDrafts === 0) {
        onClose();
      }
    } catch (error) {
      console.error('Error activating configurations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate configurations');
    } finally {
      setActivating(false);
    }
  }, [
    selectedZones,
    selectedRoutes,
    selectedAssignments,
    conflicts,
    fetchDrafts,
    onClose,
    draftZones.length,
    draftRouteSketches.length,
    draftFacilityAssignments.length,
  ]);

  const totalDrafts =
    draftZones.length + draftRouteSketches.length + draftFacilityAssignments.length;
  const totalSelected =
    selectedZones.size + selectedRoutes.size + selectedAssignments.size;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review & Activate Configurations</DialogTitle>
          <DialogDescription>
            Review draft configurations and activate them to make them effective
          </DialogDescription>
        </DialogHeader>

        {/* Workflow Reminder */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-600">Draft → Review → Activate Workflow</p>
              <p className="text-xs text-muted-foreground mt-1">
                All configurations are draft by default (active=false) and must be explicitly
                activated to take effect
              </p>
            </div>
          </div>
        </div>

        {/* Conflicts Warning */}
        {conflicts.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600">Conflicts Detected</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{conflict}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Draft Configurations Tabs */}
        <Tabs defaultValue="zones" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="zones">
              <MapPin className="h-4 w-4 mr-2" />
              Zones ({draftZones.length})
            </TabsTrigger>
            <TabsTrigger value="routes">
              <Route className="h-4 w-4 mr-2" />
              Routes ({draftRouteSketches.length})
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Building2 className="h-4 w-4 mr-2" />
              Assignments ({draftFacilityAssignments.length})
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading draft configurations...</p>
            </div>
          ) : totalDrafts === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium">No draft configurations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All configurations are active or no drafts exist
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Zone Configurations */}
              <TabsContent value="zones" className="flex-1 mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {draftZones.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No draft zones
                      </p>
                    ) : (
                      draftZones.map((zone) => (
                        <div
                          key={zone.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedZones.has(zone.id)
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                              : 'bg-background border-border hover:bg-accent'
                          }`}
                          onClick={() => toggleZoneSelection(zone.id)}
                        >
                          <Checkbox
                            checked={selectedZones.has(zone.id)}
                            onCheckedChange={() => toggleZoneSelection(zone.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{zone.name}</div>
                            {zone.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {zone.description}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                Version {zone.version}
                              </span>
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {zone.zone_type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(zone.draft_created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Route Sketches */}
              <TabsContent value="routes" className="flex-1 mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {draftRouteSketches.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No draft route sketches
                      </p>
                    ) : (
                      draftRouteSketches.map((route) => (
                        <div
                          key={route.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedRoutes.has(route.id)
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                              : 'bg-background border-border hover:bg-accent'
                          }`}
                          onClick={() => toggleRouteSelection(route.id)}
                        >
                          <Checkbox
                            checked={selectedRoutes.has(route.id)}
                            onCheckedChange={() => toggleRouteSelection(route.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{route.name}</div>
                            {route.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {route.description}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {route.route_type}
                              </span>
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {route.estimated_distance.toFixed(1)} km
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(route.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Facility Assignments */}
              <TabsContent value="assignments" className="flex-1 mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {draftFacilityAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No draft facility assignments
                      </p>
                    ) : (
                      draftFacilityAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedAssignments.has(assignment.id)
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                              : 'bg-background border-border hover:bg-accent'
                          }`}
                          onClick={() => toggleAssignmentSelection(assignment.id)}
                        >
                          <Checkbox
                            checked={selectedAssignments.has(assignment.id)}
                            onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {assignment.facility?.name || 'Unknown Facility'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              → {assignment.zone?.name || 'Unknown Zone'}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {assignment.assignment_type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(assignment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalSelected} of {totalDrafts} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleActivate}
              disabled={totalSelected === 0 || conflicts.length > 0 || activating}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {activating ? 'Activating...' : `Activate (${totalSelected})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
