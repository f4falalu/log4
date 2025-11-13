/**
 * =====================================================
 * Wizard Step 1: Source Selection
 * =====================================================
 * Select data source for scheduling
 */

import { FileUp, List, PlusCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSchedulerWizardStore } from '@/stores/schedulerWizardStore';

export function WizardStep1SourceSelection() {
  const sourceMethod = useSchedulerWizardStore((state) => state.source_method);
  const setSourceMethod = useSchedulerWizardStore(
    (state) => state.setSourceMethod
  );

  const sources = [
    {
      id: 'ready' as const,
      title: 'Ready Consignments',
      description: 'Select from consignments ready for dispatch',
      icon: List,
    },
    {
      id: 'upload' as const,
      title: 'Upload File',
      description: 'Import from Excel or CSV file',
      icon: FileUp,
    },
    {
      id: 'manual' as const,
      title: 'Manual Entry',
      description: 'Manually enter facility addresses',
      icon: PlusCircle,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Choose Data Source</h3>
        <p className="text-sm text-gray-500">
          How would you like to create your schedule?
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sources.map((source) => {
          const Icon = source.icon;
          const isSelected = sourceMethod === source.id;

          return (
            <Card
              key={source.id}
              className={`cursor-pointer p-6 transition-all hover:shadow-md ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-gray-200'
              }`}
              onClick={() => setSourceMethod(source.id)}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                    isSelected ? 'bg-blue-500' : 'bg-gray-100'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isSelected ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <h4 className="mb-2 font-semibold">{source.title}</h4>
                <p className="text-sm text-gray-500">{source.description}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
