import { FileEdit, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RequisitionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectManual: () => void;
  onSelectUpload: () => void;
}

export function RequisitionTypeDialog({
  open,
  onOpenChange,
  onSelectManual,
  onSelectUpload,
}: RequisitionTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Requisition</DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your requisition
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg hover:border-primary",
              "group"
            )}
            onClick={() => {
              onSelectManual();
              onOpenChange(false);
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileEdit className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Manual Entry</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create your requisition by manually entering items one by one. 
                Best for smaller orders or when you need precise control.
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg hover:border-primary",
              "group"
            )}
            onClick={() => {
              onSelectUpload();
              onOpenChange(false);
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Upload File</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload a CSV or PDF file containing your requisition items.
                Perfect for bulk orders or existing documents.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
