import { Lock, Trash2, Archive, Clock, MapPin, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouteFacilities, useDeleteRoute, useLockRoute, useUpdateRoute } from '@/hooks/useRoutes';
import type { Route } from '@/types/routes';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

interface RouteDetailDialogProps {
  route: Route;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RouteDetailDialog({ route, open, onOpenChange }: RouteDetailDialogProps) {
  const { data: facilities, isLoading: facilitiesLoading } = useRouteFacilities(route.id);
  const deleteMutation = useDeleteRoute();
  const lockMutation = useLockRoute();
  const updateMutation = useUpdateRoute();

  const isLocked = route.status === 'locked';
  const isSandbox = route.is_sandbox;

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this route?')) {
      deleteMutation.mutate(route.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleLock = () => {
    if (confirm('Lock this route? Locked routes cannot be modified or deleted.')) {
      lockMutation.mutate(route.id);
    }
  };

  const handleArchive = () => {
    updateMutation.mutate({ id: route.id, data: { status: 'archived' } as any });
  };

  const handleActivate = () => {
    updateMutation.mutate({ id: route.id, data: { status: 'active' } as any });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {route.name}
                {isSandbox && <Badge variant="outline">Sandbox</Badge>}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {route.zones?.name || '—'} &middot; {route.service_areas?.name || '—'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isLocked && !isSandbox && route.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={handleActivate}>
                  <Activity className="mr-2 h-4 w-4" /> Activate
                </Button>
              )}
              {!isLocked && !isSandbox && (
                <Button variant="outline" size="sm" onClick={handleLock}>
                  <Lock className="mr-2 h-4 w-4" /> Lock
                </Button>
              )}
              {!isLocked && (
                <>
                  <Button variant="outline" size="sm" onClick={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="facilities">Facility Sequence ({facilities?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4 overflow-y-auto flex-1">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`text-base ${statusColors[route.status] || ''}`}>
                    {route.status === 'locked' && <Lock className="mr-1 h-3 w-3" />}
                    {route.status}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Distance</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{route.total_distance_km ? `${route.total_distance_km} km` : 'Not calculated'}</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Est. Duration</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{route.estimated_duration_min ? `${route.estimated_duration_min} min` : 'Not calculated'}</span>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouse</span>
                  <span>{route.warehouses?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creation Mode</span>
                  <Badge variant="outline">{route.creation_mode}</Badge>
                </div>
                {route.algorithm_used && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm</span>
                    <span>{route.algorithm_used}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(route.created_at).toLocaleDateString()}</span>
                </div>
                {route.locked_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locked</span>
                    <span>{new Date(route.locked_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facilities" className="mt-4 overflow-y-auto flex-1">
            {facilitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : facilities && facilities.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Order</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Level of Care</TableHead>
                      <TableHead>LGA</TableHead>
                      <TableHead>Distance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilities.map((rf) => (
                      <TableRow key={rf.id}>
                        <TableCell className="font-mono text-center">{rf.sequence_order}</TableCell>
                        <TableCell className="font-medium">{rf.facilities?.name || '—'}</TableCell>
                        <TableCell className="capitalize">{rf.facilities?.type || '—'}</TableCell>
                        <TableCell>{rf.facilities?.level_of_care || '—'}</TableCell>
                        <TableCell>{rf.facilities?.lga || '—'}</TableCell>
                        <TableCell>
                          {rf.distance_from_previous_km
                            ? `${rf.distance_from_previous_km} km`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No facilities assigned to this route.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
