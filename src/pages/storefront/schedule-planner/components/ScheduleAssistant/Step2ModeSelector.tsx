import { Hand, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScheduleMode } from '@/hooks/useScheduleWizard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Step2ModeSelectorProps {
  onSelect: (mode: ScheduleMode) => void;
}

export function Step2ModeSelector({ onSelect }: Step2ModeSelectorProps) {
  const modes = [
    {
      value: 'manual' as ScheduleMode,
      icon: Hand,
      title: 'Manual Planning',
      description: 'Build routes step-by-step with full control over assignments',
      tooltip: 'Best for: Custom routing, special requirements, hands-on planning',
    },
    {
      value: 'ai_optimized' as ScheduleMode,
      icon: Sparkles,
      title: 'AI Optimized',
      description: 'Automatically generate optimal routes using AI algorithms',
      tooltip: 'Best for: Quick planning, standard routes, efficiency optimization',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Select Scheduling Mode</h2>
        <p className="text-muted-foreground mt-1">
          Choose how you want to plan your delivery routes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TooltipProvider>
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Tooltip key={mode.value}>
                <TooltipTrigger asChild>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                    onClick={() => onSelect(mode.value)}
                  >
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                        <Icon className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xl">{mode.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {mode.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{mode.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
