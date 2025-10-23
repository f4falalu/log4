import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeliverySchedule } from '@/hooks/useDeliverySchedules';
import { useScheduleExport } from '@/hooks/useScheduleExport';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: DeliverySchedule | null;
}

export function ExportDialog({
  open,
  onOpenChange,
  schedule
}: ExportDialogProps) {
  const { exportToPDF, exportToExcel } = useScheduleExport();

  const handleExportPDF = () => {
    if (schedule) {
      exportToPDF(schedule);
      onOpenChange(false);
    }
  };

  const handleExportExcel = () => {
    if (schedule) {
      exportToExcel(schedule);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose the format you want to export the schedule in:
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={handleExportPDF}
            >
              <FileText className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">PDF Document</div>
                <div className="text-xs text-muted-foreground">
                  Printable delivery manifest with route details
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Excel Spreadsheet</div>
                <div className="text-xs text-muted-foreground">
                  Editable schedule with summary and route sheets
                </div>
              </div>
            </Button>
          </div>

          {schedule && (
            <div className="text-xs text-muted-foreground p-3 bg-secondary rounded">
              <p><strong>Schedule:</strong> {schedule.title}</p>
              <p><strong>Date:</strong> {schedule.planned_date}</p>
              <p><strong>Facilities:</strong> {schedule.facility_ids.length} stops</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
