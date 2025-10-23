import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface FiltersSidebarProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  timeWindows: string[];
  onTimeWindowToggle: (window: string) => void;
  payloadRange: [number, number];
  onPayloadRangeChange: (range: [number, number]) => void;
  statuses: string[];
  onStatusToggle: (status: string) => void;
  onReset: () => void;
  onApply: () => void;
}

export function FiltersSidebar({
  sortBy,
  onSortChange,
  timeWindows,
  onTimeWindowToggle,
  payloadRange,
  onPayloadRangeChange,
  statuses,
  onStatusToggle,
  onReset,
  onApply
}: FiltersSidebarProps) {
  return (
    <div className="w-80 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Filters</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={['sort', 'time', 'payload', 'status']} className="space-y-2">
            {/* Sort By */}
            <AccordionItem value="sort">
              <AccordionTrigger>Sort By</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {[
                  { value: 'earliest', label: 'Earliest Departure' },
                  { value: 'latest', label: 'Latest Departure' },
                  { value: 'highest-payload', label: 'Highest Payload' },
                  { value: 'shortest-route', label: 'Shortest Route' }
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={sortBy === option.value}
                      onCheckedChange={() => onSortChange(option.value)}
                    />
                    <Label htmlFor={option.value} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Time Window */}
            <AccordionItem value="time">
              <AccordionTrigger>Time Window</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {[
                  { value: 'morning', label: '06:00 - 12:00 (Morning)' },
                  { value: 'afternoon', label: '12:00 - 18:00 (Afternoon)' },
                  { value: 'evening', label: '18:00 - 24:00 (Evening)' },
                  { value: 'all_day', label: 'All Day' }
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={timeWindows.includes(option.value)}
                      onCheckedChange={() => onTimeWindowToggle(option.value)}
                    />
                    <Label htmlFor={option.value} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Payload Range */}
            <AccordionItem value="payload">
              <AccordionTrigger>Payload Range</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{payloadRange[0]} kg</span>
                    <span>{payloadRange[1]} kg</span>
                  </div>
                  <Slider
                    value={payloadRange}
                    onValueChange={(value) => onPayloadRangeChange(value as [number, number])}
                    min={0}
                    max={5000}
                    step={100}
                    className="w-full"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Status */}
            <AccordionItem value="status">
              <AccordionTrigger>Status</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {[
                  { value: 'draft', label: 'Draft' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'exported', label: 'Exported' },
                  { value: 'dispatched', label: 'Dispatched' }
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={statuses.includes(option.value)}
                      onCheckedChange={() => onStatusToggle(option.value)}
                    />
                    <Label htmlFor={`status-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      <Separator />
      
      <div className="p-4 space-y-2">
        <Button variant="outline" className="w-full" onClick={onReset}>
          Reset Filters
        </Button>
        <Button className="w-full" onClick={onApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
