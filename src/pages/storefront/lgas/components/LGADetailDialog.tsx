import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Building2, Users, Edit, Trash2, Calendar } from 'lucide-react';
import { LGA } from '@/types/zones';
import { format } from 'date-fns';

interface LGADetailDialogProps {
  lga: LGA;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lga: LGA) => void;
  onDelete: (id: string) => void;
}

export function LGADetailDialog({
  lga,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: LGADetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {lga.name}
          </DialogTitle>
          <DialogDescription>Local Government Area Details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">State</p>
                <Badge variant="secondary" className="mt-1">
                  {lga.state}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Population</p>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base font-semibold">
                    {lga.population ? lga.population.toLocaleString() : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Assignments */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Assignments</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">Zone</p>
                {lga.zones ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{lga.zones.name}</p>
                      {lga.zones.code && (
                        <p className="text-xs text-muted-foreground">Code: {lga.zones.code}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned to any zone</p>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">Warehouse</p>
                {lga.warehouses ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{lga.warehouses.name}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned to any warehouse</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">System Information</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Created</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="font-medium">
                    {format(new Date(lga.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-1">Last Updated</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="font-medium">
                    {format(new Date(lga.updated_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">LGA ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{lga.id}</code>
            </div>
          </div>

          {/* Additional Metadata */}
          {lga.metadata && Object.keys(lga.metadata).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Additional Information</h3>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                  {JSON.stringify(lga.metadata, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onEdit(lga);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onDelete(lga.id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
