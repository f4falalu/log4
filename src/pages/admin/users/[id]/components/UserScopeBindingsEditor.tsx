import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X, Building2, Tags, MapPin, Hospital } from 'lucide-react';
import {
  useUserScopeBindings,
  useAssignScopeBinding,
  useRemoveScopeBinding,
  useWarehouses,
  usePrograms,
  useFacilities,
  useAdminUnits,
} from '@/hooks/rbac';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/types/supabase';

type ScopeType = Database['public']['Enums']['scope_type'];

interface UserScopeBindingsEditorProps {
  userId: string;
}

const SCOPE_TYPE_META = {
  warehouse: {
    label: 'Warehouse',
    icon: Building2,
    color: 'blue' as const,
  },
  program: {
    label: 'Program',
    icon: Tags,
    color: 'green' as const,
  },
  zone: {
    label: 'Zone',
    icon: MapPin,
    color: 'purple' as const,
  },
  facility: {
    label: 'Facility',
    icon: Hospital,
    color: 'orange' as const,
  },
};

export function UserScopeBindingsEditor({ userId }: UserScopeBindingsEditorProps) {
  const [selectedScopeType, setSelectedScopeType] = useState<ScopeType | ''>('');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const { toast } = useToast();

  const { data: bindings, isLoading: bindingsLoading } = useUserScopeBindings(userId);
  const { data: warehouses } = useWarehouses();
  const { data: programs } = usePrograms();
  const { data: facilities } = useFacilities();
  const { data: zones } = useAdminUnits();

  const assignBinding = useAssignScopeBinding();
  const removeBinding = useRemoveScopeBinding();

  const handleAssign = async () => {
    if (!selectedScopeType || !selectedScopeId) return;

    try {
      await assignBinding.mutateAsync({
        userId,
        scopeType: selectedScopeType,
        scopeId: selectedScopeId,
      });

      toast({
        title: 'Scope binding added',
        description: `User access has been restricted to the selected ${selectedScopeType}`,
      });

      setSelectedScopeType('');
      setSelectedScopeId('');
    } catch (error) {
      toast({
        title: 'Error adding scope binding',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (bindingId: string) => {
    try {
      await removeBinding.mutateAsync({ bindingId, userId });

      toast({
        title: 'Scope binding removed',
        description: 'User access restriction has been removed',
      });
    } catch (error) {
      toast({
        title: 'Error removing scope binding',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const getScopeOptions = () => {
    switch (selectedScopeType) {
      case 'warehouse':
        return warehouses || [];
      case 'program':
        return programs || [];
      case 'facility':
        return facilities || [];
      case 'zone':
        return zones || [];
      default:
        return [];
    }
  };

  const scopeOptions = getScopeOptions();

  if (bindingsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scope Bindings</CardTitle>
          <CardDescription>Restrict user access to specific data scopes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBindings = bindings && bindings.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scope Bindings</CardTitle>
        <CardDescription>
          Restrict user access to specific warehouses, programs, zones, or facilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-1">How scope bindings work:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>No bindings = Organization-wide access</li>
            <li>With bindings = Access restricted to only the specified scopes</li>
            <li>Multiple scopes of the same type = OR logic (access to any of them)</li>
          </ul>
        </div>

        {/* Current Bindings */}
        <div className="space-y-2">
          <Label>Active Scope Bindings</Label>
          {hasBindings ? (
            <div className="space-y-2">
              {bindings.map((binding) => {
                const meta = SCOPE_TYPE_META[binding.scope_type];
                const Icon = meta.icon;

                return (
                  <div
                    key={binding.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{binding.scope_name || binding.scope_id}</p>
                          <Badge variant="outline" className="text-xs">
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {binding.assigned_at ? new Date(binding.assigned_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(binding.id)}
                      disabled={removeBinding.isPending}
                    >
                      {removeBinding.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <p className="text-sm font-medium">Organization-wide access</p>
              <p className="text-xs text-muted-foreground mt-1">
                No scope restrictions applied
              </p>
            </div>
          )}
        </div>

        {/* Add New Binding */}
        <div className="space-y-4 pt-4 border-t">
          <Label>Add Scope Binding</Label>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Scope Type</Label>
              <Select value={selectedScopeType} onValueChange={(value) => {
                setSelectedScopeType(value as ScopeType);
                setSelectedScopeId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_TYPE_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{meta.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedScopeType && (
              <div className="space-y-2">
                <Label>{SCOPE_TYPE_META[selectedScopeType].label}</Label>
                <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${selectedScopeType}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((option: any) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div>
                          <span className="font-medium">{option.name}</span>
                          {(option.code || option.warehouse_code) && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({option.code || option.warehouse_code})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    {scopeOptions.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No {selectedScopeType}s available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleAssign}
              disabled={!selectedScopeType || !selectedScopeId || assignBinding.isPending}
              className="w-full"
            >
              {assignBinding.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scope Binding
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
