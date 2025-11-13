/**
 * =====================================================
 * Wizard Step 2: Mode Selection
 * =====================================================
 * Choose between manual or AI-optimized scheduling
 */

import { Brain, Hand } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSchedulerWizardStore } from '@/stores/schedulerWizardStore';

export function WizardStep2ModeSelection() {
  const schedulingMode = useSchedulerWizardStore(
    (state) => state.scheduling_mode
  );
  const setSchedulingMode = useSchedulerWizardStore(
    (state) => state.setSchedulingMode
  );

  const modes = [
    {
      id: 'manual' as const,
      title: 'Manual Scheduling',
      description: 'Create batches manually with full control',
      icon: Hand,
      features: [
        'Drag-and-drop facility assignment',
        'Custom batch creation',
        'Full flexibility',
      ],
    },
    {
      id: 'ai_optimized' as const,
      title: 'AI Optimization',
      description: 'Let AI create optimized route batches',
      icon: Brain,
      features: [
        'Automatic route optimization',
        'Distance & time minimization',
        'Capacity optimization',
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Choose Scheduling Mode</h3>
        <p className="text-sm text-gray-500">
          How would you like to organize the deliveries?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = schedulingMode === mode.id;

          return (
            <Card
              key={mode.id}
              className={`cursor-pointer p-6 transition-all hover:shadow-md ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-gray-200'
              }`}
              onClick={() => setSchedulingMode(mode.id)}
            >
              <div className="flex flex-col">
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
                <h4 className="mb-2 text-lg font-semibold">{mode.title}</h4>
                <p className="mb-4 text-sm text-gray-500">
                  {mode.description}
                </p>
                <ul className="space-y-2">
                  {mode.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="mt-1 text-green-500">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
