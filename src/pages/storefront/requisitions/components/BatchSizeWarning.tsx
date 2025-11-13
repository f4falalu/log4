import { AlertTriangle, PackageOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BatchSizeWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onConfirm: () => void;
}

export function BatchSizeWarning({
  open,
  onOpenChange,
  itemCount,
  onConfirm,
}: BatchSizeWarningProps) {
  const getWarningLevel = (count: number) => {
    if (count >= 100) return { level: 'caution', icon: AlertTriangle, color: 'text-red-600' };
    if (count >= 50) return { level: 'warning', icon: PackageOpen, color: 'text-yellow-600' };
    return { level: 'info', icon: PackageOpen, color: 'text-blue-600' };
  };

  const { level, icon: Icon, color } = getWarningLevel(itemCount);

  const getTitle = () => {
    if (itemCount >= 100) return 'Large Batch Upload';
    if (itemCount >= 50) return 'Moderate Batch Upload';
    return 'Batch Upload Confirmation';
  };

  const getDescription = () => {
    if (itemCount >= 100) {
      return `You're about to upload ${itemCount} items. This is a very large requisition that may take longer to process. Are you sure you want to continue?`;
    }
    if (itemCount >= 50) {
      return `You're uploading ${itemCount} items. This is a moderately large requisition. Please confirm to proceed.`;
    }
    return `You're uploading ${itemCount} items. Would you like to continue?`;
  };

  const getEstimatedTime = () => {
    if (itemCount >= 100) return 'Estimated processing time: 30-60 seconds';
    if (itemCount >= 50) return 'Estimated processing time: 15-30 seconds';
    return 'Processing should complete quickly';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-muted`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>{getDescription()}</p>
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Items:</span>
                <span className={`font-bold ${color}`}>{itemCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {getEstimatedTime()}
              </div>
            </div>
            {itemCount >= 100 && (
              <p className="text-sm text-muted-foreground italic">
                💡 Tip: Consider breaking very large requisitions into smaller batches for better management.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Continue with Upload
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
