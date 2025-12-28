import { Button } from '@/components/ui/button';
import { Check, X, Trash2 } from 'lucide-react';

interface DrawControlsProps {
  onFinish: () => void;
  onCancel: () => void;
  onDeleteLastPoint: () => void;
  isVisible: boolean;
}

export function DrawControls({
  onFinish,
  onCancel,
  onDeleteLastPoint,
  isVisible,
}: DrawControlsProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-floating flex items-center gap-2 bg-background/95 backdrop-blur border rounded-lg p-2 shadow-lg">
      <span className="text-sm font-medium px-2">Drawing Mode</span>
      <div className="h-4 w-px bg-border" />
      <Button
        size="sm"
        variant="ghost"
        onClick={onDeleteLastPoint}
        className="h-8"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete Point
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        className="h-8"
      >
        <X className="h-4 w-4 mr-1" />
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={onFinish}
        className="h-8"
      >
        <Check className="h-4 w-4 mr-1" />
        Finish
      </Button>
    </div>
  );
}
