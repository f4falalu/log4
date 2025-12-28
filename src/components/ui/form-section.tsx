import * as React from "react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * FormSection - Structured form section with optional collapsibility
 *
 * Provides visual grouping for related form fields with consistent styling.
 * Can be used in both collapsible (Accordion) and static modes.
 *
 * @example
 * ```tsx
 * <FormSection title="Schedule Details" description="Basic scheduling information">
 *   <Label>Date</Label>
 *   <Input type="date" />
 * </FormSection>
 * ```
 */
export function FormSection({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: FormSectionProps) {
  if (collapsible) {
    return (
      <Accordion type="single" collapsible defaultValue={defaultOpen ? "item-1" : undefined} className={className}>
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="hover:no-underline">
            <div className="text-left">
              <h3 className="text-sm font-semibold">{title}</h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {children}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
