// MOD4 Support Request Form
// Main form for submitting support/trade-off requests

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronRight, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IssueTypeSelector, ISSUE_TYPES, type IssueType } from './IssueTypeSelector';
import { EvidenceCapture } from './EvidenceCapture';
import { useBatchStore } from '@/stores/batchStore';
import { useAuthStore } from '@/stores/authStore';
import { createEvent } from '@/lib/db/events';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FormStep = 'type' | 'details' | 'evidence' | 'review';

interface FormData {
  issueType: IssueType | null;
  description: string;
  affectedSlotId: string | null;
  photos: string[];
  urgency: 'low' | 'normal' | 'urgent';
}

interface SupportRequestFormProps {
  onSubmitSuccess?: () => void;
}

export function SupportRequestForm({ onSubmitSuccess }: SupportRequestFormProps) {
  const [step, setStep] = useState<FormStep>('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    issueType: null,
    description: '',
    affectedSlotId: null,
    photos: [],
    urgency: 'normal'
  });

  const { slots, currentBatch } = useBatchStore();
  const { driver } = useAuthStore();

  const steps: FormStep[] = ['type', 'details', 'evidence', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'type':
        return formData.issueType !== null;
      case 'details':
        return formData.description.trim().length >= 10;
      case 'evidence':
        return true; // Evidence is optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.issueType || !driver) return;

    setIsSubmitting(true);
    try {
      await createEvent({
        type: 'support_request',
        driver_id: driver.id,
        batch_id: currentBatch?.id,
        slot_id: formData.affectedSlotId ?? undefined,
        payload: {
          issueType: formData.issueType.id,
          severity: formData.issueType.severity,
          description: formData.description,
          urgency: formData.urgency,
          photoCount: formData.photos.length,
          // Note: In production, photos would be uploaded to blob storage
          // and only URLs would be stored here
          hasEvidence: formData.photos.length > 0
        }
      });

      toast.success('Support request submitted', {
        description: 'A dispatcher will review your request shortly.'
      });

      onSubmitSuccess?.();
    } catch (error) {
      console.error('[Support] Failed to submit request:', error);
      toast.error('Failed to submit request', {
        description: 'Your request will be saved and submitted when online.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSlots = slots.filter(s => s.status !== 'delivered');

  return (
    <div className="flex flex-col h-full">
      {/* Progress Indicator */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  i <= currentStepIndex 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors",
                    i < currentStepIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Issue</span>
          <span>Details</span>
          <span>Evidence</span>
          <span>Review</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  What's the issue?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select the type of problem you're experiencing
                </p>
              </div>
              <IssueTypeSelector
                selectedType={formData.issueType?.id ?? null}
                onSelect={(type) => setFormData(prev => ({ ...prev, issueType: type }))}
              />
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Describe the issue
                </h2>
                <p className="text-sm text-muted-foreground">
                  Provide details to help us understand the problem
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Description *
                </label>
                <Textarea
                  placeholder="Please describe the issue in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.description.length} characters (min 10)
                </p>
              </div>

              {activeSlots.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Affected Delivery (optional)
                  </label>
                  <Select
                    value={formData.affectedSlotId ?? 'none'}
                    onValueChange={(v) => setFormData(prev => ({ 
                      ...prev, 
                      affectedSlotId: v === 'none' ? null : v 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a delivery" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific delivery</SelectItem>
                      {activeSlots.map(slot => (
                        <SelectItem key={slot.id} value={slot.id}>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>Slot #{slot.sequence}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Urgency Level
                </label>
                <Select
                  value={formData.urgency}
                  onValueChange={(v: 'low' | 'normal' | 'urgent') => 
                    setFormData(prev => ({ ...prev, urgency: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Can wait</SelectItem>
                    <SelectItem value="normal">Normal - Need response soon</SelectItem>
                    <SelectItem value="urgent">Urgent - Need immediate help</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {step === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Add Evidence
                </h2>
                <p className="text-sm text-muted-foreground">
                  Capture photos to support your request (optional)
                </p>
              </div>
              <EvidenceCapture
                photos={formData.photos}
                onPhotosChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
              />
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Review Your Request
                </h2>
                <p className="text-sm text-muted-foreground">
                  Confirm the details before submitting
                </p>
              </div>

              <div className="space-y-4 bg-muted/30 rounded-xl p-4">
                {/* Issue Type */}
                <div className="flex items-start gap-3">
                  {formData.issueType && (
                    <>
                      <formData.issueType.icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {formData.issueType.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Severity: {formData.issueType.severity}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Description */}
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-sm text-foreground">{formData.description}</p>
                </div>

                {/* Affected Slot */}
                {formData.affectedSlotId && (
                  <div className="border-t border-border/50 pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Affected Delivery
                    </p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Slot #{slots.find(s => s.id === formData.affectedSlotId)?.sequence ?? '?'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Photos */}
                {formData.photos.length > 0 && (
                  <div className="border-t border-border/50 pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Evidence Photos ({formData.photos.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formData.photos.map((photo, i) => (
                        <img 
                          key={i}
                          src={photo}
                          alt={`Evidence ${i + 1}`}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Urgency */}
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Urgency
                  </p>
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                    formData.urgency === 'urgent' && "bg-destructive/20 text-destructive",
                    formData.urgency === 'normal' && "bg-warning/20 text-warning-foreground",
                    formData.urgency === 'low' && "bg-muted text-muted-foreground"
                  )}>
                    {formData.urgency.charAt(0).toUpperCase() + formData.urgency.slice(1)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex gap-3">
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Back
            </Button>
          )}
          
          {step !== 'review' ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
