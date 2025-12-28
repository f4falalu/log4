import * as React from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface ThreeColumnLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftLabel?: string;
  centerLabel?: string;
  rightLabel?: string;
  defaultLeftSize?: number;
  defaultRightSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
  className?: string;
}

/**
 * ThreeColumnLayout - Resizable three-column layout for complex operations
 *
 * Provides a professional multi-panel workspace with:
 * - Left panel: Configuration/options
 * - Center panel: Main visualization/content
 * - Right panel: Details/forms
 *
 * On mobile, collapses to tabs for better usability.
 *
 * @example
 * ```tsx
 * <ThreeColumnLayout
 *   leftPanel={<RouteConfiguration />}
 *   centerPanel={<MapVisualization />}
 *   rightPanel={<RouteDetailsForm />}
 *   leftLabel="Configuration"
 *   centerLabel="Map"
 *   rightLabel="Details"
 * />
 * ```
 */
export function ThreeColumnLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftLabel = 'Left',
  centerLabel = 'Center',
  rightLabel = 'Right',
  defaultLeftSize = 20,
  defaultRightSize = 25,
  minLeftSize = 15,
  minRightSize = 20,
  className,
}: ThreeColumnLayoutProps) {
  return (
    <>
      {/* Desktop: Resizable Panels */}
      <div className={cn('hidden lg:block h-full', className)}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel */}
          <ResizablePanel defaultSize={defaultLeftSize} minSize={minLeftSize}>
            <div className="h-full border-r bg-background">
              <ScrollArea className="h-full">
                <div className="p-4">{leftPanel}</div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Panel */}
          <ResizablePanel defaultSize={100 - defaultLeftSize - defaultRightSize} minSize={30}>
            <div className="h-full bg-background">
              <ScrollArea className="h-full">
                <div className="p-4">{centerPanel}</div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel */}
          <ResizablePanel defaultSize={defaultRightSize} minSize={minRightSize}>
            <div className="h-full border-l bg-background">
              <ScrollArea className="h-full">
                <div className="p-4">{rightPanel}</div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Tabs */}
      <div className={cn('lg:hidden', className)}>
        <Tabs defaultValue="center" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="left">{leftLabel}</TabsTrigger>
            <TabsTrigger value="center">{centerLabel}</TabsTrigger>
            <TabsTrigger value="right">{rightLabel}</TabsTrigger>
          </TabsList>

          <TabsContent value="left" className="h-full">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4">{leftPanel}</div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="center" className="h-full">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4">{centerPanel}</div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="right" className="h-full">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4">{rightPanel}</div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/**
 * TwoColumnLayout - Simplified two-column variant
 */
export interface TwoColumnLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  defaultLeftSize?: number;
  minLeftSize?: number;
  className?: string;
}

export function TwoColumnLayout({
  leftPanel,
  rightPanel,
  leftLabel = 'Left',
  rightLabel = 'Right',
  defaultLeftSize = 50,
  minLeftSize = 30,
  className,
}: TwoColumnLayoutProps) {
  return (
    <>
      {/* Desktop: Resizable Panels */}
      <div className={cn('hidden md:block h-full', className)}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={defaultLeftSize} minSize={minLeftSize}>
            <div className="h-full border-r bg-background">
              <ScrollArea className="h-full">
                <div className="p-4">{leftPanel}</div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={100 - defaultLeftSize} minSize={minLeftSize}>
            <div className="h-full bg-background">
              <ScrollArea className="h-full">
                <div className="p-4">{rightPanel}</div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Tabs */}
      <div className={cn('md:hidden', className)}>
        <Tabs defaultValue="left" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="left">{leftLabel}</TabsTrigger>
            <TabsTrigger value="right">{rightLabel}</TabsTrigger>
          </TabsList>

          <TabsContent value="left" className="h-full">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4">{leftPanel}</div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="right" className="h-full">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4">{rightPanel}</div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
