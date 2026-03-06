import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, Plus, X, Check } from 'lucide-react';
import { useUpdateZone } from '@/hooks/useOperationalZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useLGAs, useUpdateLGA } from '@/hooks/useLGAs';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { OperationalZone, UpdateZoneInput } from '@/types/zones';
import { toast } from 'sonner';

interface EditZoneDialogProps {
  zone: OperationalZone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditZoneDialog({ zone, open, onOpenChange }: EditZoneDialogProps) {
  const [formData, setFormData] = useState<UpdateZoneInput>({
    id: zone.id,
    name: zone.name,
    code: zone.code || undefined,
    description: zone.description || undefined,
    is_active: zone.is_active,
  });
  const [saving, setSaving] = useState(false);

  const updateZone = useUpdateZone();
  const queryClient = useQueryClient();

  const { data: facilitiesData } = useFacilities();
  const { data: allLGAs } = useLGAs();
  const { data: zoneLGAs } = useLGAs({ zone_id: zone.id });

  const allFacilities = facilitiesData?.facilities || [];

  const zoneFacilities = useMemo(
    () => allFacilities.filter((f: any) => f.zone_id === zone.id),
    [allFacilities, zone.id]
  );
  const unassignedFacilities = useMemo(
    () => allFacilities.filter((f: any) => !f.zone_id),
    [allFacilities]
  );

  const unassignedLGAs = useMemo(
    () => (allLGAs || []).filter((l: any) => !l.zone_id),
    [allLGAs]
  );

  useEffect(() => {
    setFormData({
      id: zone.id,
      name: zone.name,
      code: zone.code || undefined,
      description: zone.description || undefined,
      is_active: zone.is_active,
    });
  }, [zone]);

  const handleChange = (field: keyof UpdateZoneInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateZone.mutateAsync(formData);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const assignFacility = async (facilityId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('facilities')
        .update({ zone_id: zone.id })
        .eq('id', facilityId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['zone-summary', zone.id] });
      toast.success('Facility assigned to zone');
    } catch (err: any) {
      toast.error(`Failed to assign facility: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const unassignFacility = async (facilityId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('facilities')
        .update({ zone_id: null })
        .eq('id', facilityId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['zone-summary', zone.id] });
      toast.success('Facility removed from zone');
    } catch (err: any) {
      toast.error(`Failed to remove facility: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const assignLGA = async (lgaId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lgas')
        .update({ zone_id: zone.id })
        .eq('id', lgaId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['lgas'] });
      queryClient.invalidateQueries({ queryKey: ['zone-summary', zone.id] });
      toast.success('LGA assigned to zone');
    } catch (err: any) {
      toast.error(`Failed to assign LGA: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const unassignLGA = async (lgaId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lgas')
        .update({ zone_id: null })
        .eq('id', lgaId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['lgas'] });
      queryClient.invalidateQueries({ queryKey: ['zone-summary', zone.id] });
      toast.success('LGA removed from zone');
    } catch (err: any) {
      toast.error(`Failed to remove LGA: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Zone</DialogTitle>
          <DialogDescription>
            Update zone information and manage assigned resources.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="lgas">
              LGAs
              {(zoneLGAs?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {zoneLGAs?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="facilities">
              Facilities
              {zoneFacilities.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {zoneFacilities.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Zone Name *</Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g., Central Zone"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-code">Zone Code</Label>
                  <Input
                    id="edit-code"
                    placeholder="e.g., CZ01"
                    value={formData.code || ''}
                    onChange={(e) => handleChange('code', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional short code for easy reference
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Describe the zone's coverage area..."
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-is_active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this zone for operations
                    </p>
                  </div>
                  <Switch
                    id="edit-is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={updateZone.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateZone.isPending}>
                    {updateZone.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          {/* LGAs Tab */}
          <TabsContent value="lgas" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Assigned LGAs
                </CardTitle>
                <CardDescription>
                  {zoneLGAs?.length || 0} LGA(s) in this zone
                </CardDescription>
              </CardHeader>
              <CardContent>
                {zoneLGAs && zoneLGAs.length > 0 ? (
                  <div className="space-y-2">
                    {zoneLGAs.map((lga: any) => (
                      <div
                        key={lga.id}
                        className="flex items-center justify-between p-2.5 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{lga.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lga.state}
                            {lga.population && ` · Pop: ${lga.population.toLocaleString()}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unassignLGA(lga.id)}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No LGAs assigned
                  </p>
                )}
              </CardContent>
            </Card>

            {unassignedLGAs.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Available LGAs
                  </CardTitle>
                  <CardDescription>
                    {unassignedLGAs.length} unassigned LGA(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {unassignedLGAs.map((lga: any) => (
                      <div
                        key={lga.id}
                        className="flex items-center justify-between p-2.5 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{lga.name}</p>
                          <p className="text-xs text-muted-foreground">{lga.state}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => assignLGA(lga.id)}
                          disabled={saving}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Facilities
                </CardTitle>
                <CardDescription>
                  {zoneFacilities.length} facilit{zoneFacilities.length === 1 ? 'y' : 'ies'} in this zone
                </CardDescription>
              </CardHeader>
              <CardContent>
                {zoneFacilities.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {zoneFacilities.map((facility: any) => (
                      <div
                        key={facility.id}
                        className="flex items-center justify-between p-2.5 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{facility.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {facility.address}
                            {facility.lga && ` · LGA: ${facility.lga}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 flex-shrink-0"
                          onClick={() => unassignFacility(facility.id)}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No facilities assigned
                  </p>
                )}
              </CardContent>
            </Card>

            {unassignedFacilities.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Available Facilities
                  </CardTitle>
                  <CardDescription>
                    {unassignedFacilities.length} unassigned facilit{unassignedFacilities.length === 1 ? 'y' : 'ies'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {unassignedFacilities.map((facility: any) => (
                      <div
                        key={facility.id}
                        className="flex items-center justify-between p-2.5 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{facility.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{facility.address}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 flex-shrink-0"
                          onClick={() => assignFacility(facility.id)}
                          disabled={saving}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
