import { FileEdit, Upload, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScheduleSource } from '@/hooks/useScheduleWizard';

interface Step1SourceSelectorProps {
  onSelect: (source: ScheduleSource) => void;
}

export function Step1SourceSelector({ onSelect }: Step1SourceSelectorProps) {
  const sources = [
    {
      value: 'manual' as ScheduleSource,
      icon: FileEdit,
      title: 'Manual Selection',
      description: 'Choose facilities from your list and build custom routes',
    },
    {
      value: 'upload' as ScheduleSource,
      icon: Upload,
      title: 'Upload Excel',
      description: 'Import a dispatch list from CSV or Excel file',
    },
    {
      value: 'ready_for_dispatch' as ScheduleSource,
      icon: Package,
      title: 'Ready for Dispatch',
      description: 'Use all approved requisitions ready for scheduling',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Choose Schedule Source</h2>
        <p className="text-muted-foreground mt-1">
          Select how you want to create your delivery schedule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <Card
              key={source.value}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
              onClick={() => onSelect(source.value)}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{source.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {source.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
