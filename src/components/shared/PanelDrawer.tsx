import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  content: React.ReactNode;
}

interface PanelDrawerProps {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  tabs: PanelTab[];
  side?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl";
  defaultTab?: string;
  onClose?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md", 
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

export function PanelDrawer({
  title,
  description,
  trigger,
  tabs,
  side = "right",
  size = "lg",
  defaultTab,
  onClose,
  className,
}: PanelDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent 
        side={side} 
        className={cn(
          "bg-card/95 backdrop-blur-md border-border shadow-xl",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <SheetHeader className="border-b border-border pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-semibold">
                {title}
              </SheetTitle>
              {description && (
                <SheetDescription className="text-sm text-muted-foreground">
                  {description}
                </SheetDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 mb-6 bg-secondary/30 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                <span className="truncate">{tab.label}</span>
                {tab.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="h-full overflow-y-auto data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2"
              >
                <div className="space-y-4">
                  {tab.content}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 mt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="hover:border-red-500 hover:text-red-700"
            >
              Close
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Convenience components for common panel types
export function DetailPanel({
  title,
  description,
  trigger,
  children,
  ...props
}: Omit<PanelDrawerProps, 'tabs'> & { children: React.ReactNode }) {
  const tabs: PanelTab[] = [
    {
      id: 'details',
      label: 'Details',
      content: children,
    },
  ];

  return (
    <PanelDrawer
      title={title}
      description={description}
      trigger={trigger}
      tabs={tabs}
      {...props}
    />
  );
}

export function InfoCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  variant = "default" 
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantClasses = {
    default: "border-border bg-secondary/10",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-amber-500/30 bg-amber-500/5", 
    danger: "border-red-500/30 bg-red-500/5",
  };

  const valueClasses = {
    default: "text-foreground",
    success: "text-green-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  };

  return (
    <Card className={cn("border-2 transition-colors duration-200", variantClasses[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className={cn("text-2xl font-bold", valueClasses[variant])}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-md", variantClasses[variant])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
