import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-biko-md border border-biko-border bg-background px-3 py-2 text-operational text-sm ring-offset-background transition-all duration-fast placeholder:text-muted-foreground hover:border-biko-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biko-primary focus-visible:ring-offset-2 focus-visible:border-biko-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
