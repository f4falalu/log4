import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIcon, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Inspection {
  id: string;
  inspection_id: string;
  vehicle_id: string;
  inspection_date: string;
  inspection_type: string;
  inspector_name: string;
  overall_status: string;
  roadworthy: boolean;
  vehicle?: {
    make: string;
    model: string;
    license_plate: string;
  };
}

interface InspectionsCalendarViewProps {
  inspections: Inspection[];
  onClose: () => void;
}

export function InspectionsCalendarView({ inspections, onClose }: InspectionsCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Group inspections by date
  const inspectionsByDate = inspections.reduce((acc, inspection) => {
    const dateKey = new Date(inspection.inspection_date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(inspection);
    return acc;
  }, {} as Record<string, Inspection[]>);

  // Get dates with inspections for calendar highlighting
  const datesWithInspections = Object.keys(inspectionsByDate).map(dateStr => new Date(dateStr));

  // Get inspections for selected date
  const selectedInspections = selectedDate
    ? inspectionsByDate[selectedDate.toDateString()] || []
    : [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'passed with conditions':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      case 'pending':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      passed: 'default',
      'passed with conditions': 'secondary',
      failed: 'destructive',
      pending: 'outline',
    };
    return <Badge variant={variants[status.toLowerCase()] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle>Inspections Calendar</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <List className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Calendar */}
              <div className="flex flex-col items-center justify-start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasInspection: datesWithInspections,
                  }}
                  modifiersClassNames={{
                    hasInspection: 'bg-primary/20 font-bold',
                  }}
                />
                <div className="mt-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-primary/20"></span>
                    Days with inspections
                  </p>
                </div>
              </div>

              {/* Inspections List for Selected Date */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold mb-3">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'Select a date'}
                </h3>

                <ScrollArea className="flex-1 pr-4">
                  {selectedInspections.length > 0 ? (
                    <div className="space-y-3">
                      {selectedInspections.map((inspection) => (
                        <div
                          key={inspection.id}
                          className={cn(
                            'p-3 rounded-lg border',
                            getStatusColor(inspection.overall_status)
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">
                                {inspection.vehicle?.make} {inspection.vehicle?.model}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {inspection.vehicle?.license_plate}
                              </p>
                            </div>
                            {getStatusBadge(inspection.overall_status)}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                            <div>
                              <p className="text-muted-foreground">Type</p>
                              <p className="font-medium capitalize">
                                {inspection.inspection_type.replace('_', ' ')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Inspector</p>
                              <p className="font-medium">{inspection.inspector_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Roadworthy</p>
                              <p className="font-medium">
                                {inspection.roadworthy ? '✓ Yes' : '✗ No'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">ID</p>
                              <p className="font-medium">{inspection.inspection_id}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No inspections scheduled for this date
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
