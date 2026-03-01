// MOD4 Support Page
// Phase 5: Support/Trade-off Request Screen

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, History, MessageSquare, CheckCircle2, Clock, AlertCircle, AlertTriangle, Truck } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { SupportRequestForm, HandOffRequestForm } from '@/components/support';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PreviousRequest {
  id: string;
  type: string;
  requestType: 'support' | 'handoff';
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: Date;
}

type ViewMode = 'list' | 'new' | 'handoff';

export default function Support() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [requests] = useState<PreviousRequest[]>([]);

  const handleRequestSuccess = () => {
    setViewMode('list');
  };

  const statusConfig = {
    pending: { 
      icon: Clock, 
      label: 'Pending', 
      className: 'text-muted-foreground bg-muted/50' 
    },
    in_progress: { 
      icon: MessageSquare, 
      label: 'In Progress', 
      className: 'text-warning bg-warning/10' 
    },
    resolved: { 
      icon: CheckCircle2, 
      label: 'Resolved', 
      className: 'text-success bg-success/10' 
    }
  };

  return (
    <AppShell title="Support" showNav={viewMode === 'list'}>
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Header Actions */}
            <div className="p-4 border-b border-border/50 space-y-3">
              <Button
                onClick={() => setViewMode('new')}
                className="w-full h-14 gap-3 text-base"
              >
                <Plus className="w-5 h-5" />
                New Support Request
              </Button>
              
              <Button
                onClick={() => setViewMode('handoff')}
                variant="destructive"
                className="w-full h-14 gap-3 text-base"
              >
                <Truck className="w-5 h-5" />
                Vehicle Hand-Off Request
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Use Hand-Off when vehicle is damaged/broken and delivery cannot continue
              </p>
            </div>

            {/* Request History */}
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Previous Requests
                  </h2>
                </div>

                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No previous requests</p>
                    <p className="text-sm text-muted-foreground/70">
                      Your support requests will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request, index) => {
                      const status = statusConfig[request.status];
                      const StatusIcon = status.icon;
                      const isHandoff = request.requestType === 'handoff';

                      return (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "border rounded-xl p-4",
                            isHandoff 
                              ? "bg-destructive/5 border-destructive/30" 
                              : "bg-card border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isHandoff && (
                                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                                )}
                                <p className="font-medium text-foreground">
                                  {request.type}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {request.description}
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-2">
                                {request.createdAt.toLocaleDateString()} at{' '}
                                {request.createdAt.toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                              status.className
                            )}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Help */}
            <div className="p-4 border-t border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                For urgent emergencies, call dispatch directly at{' '}
                <a href="tel:1800555000" className="text-primary font-medium">
                  1-800-555-000
                </a>
              </p>
            </div>
          </motion.div>
        ) : viewMode === 'new' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
          >
            {/* Back button in header area */}
            <div className="flex items-center gap-3 p-4 border-b border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
              >
                ← Back
              </Button>
              <h1 className="font-semibold">New Request</h1>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <SupportRequestForm onSubmitSuccess={handleRequestSuccess} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="handoff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
          >
            {/* Back button in header area */}
            <div className="flex items-center gap-3 p-4 border-b border-destructive/30 bg-destructive/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
              >
                ← Back
              </Button>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h1 className="font-semibold text-destructive">Vehicle Hand-Off</h1>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <HandOffRequestForm 
                onSubmitSuccess={handleRequestSuccess}
                onCancel={() => setViewMode('list')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
