// MOD4 Hand-Off Request Form
// Multi-step form for vehicle breakdown and consignment transfer

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  MapPin,
  Camera,
  Package,
  CheckCircle2,
  Shield,
  Loader2,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { DamageTypeSelector, DAMAGE_TYPES, type DamageType } from './DamageTypeSelector';
import { EvidenceCapture } from './EvidenceCapture';
import { createEvent } from '@/lib/db/events';
import { useAuthStore } from '@/stores/authStore';
import { useBatchStore } from '@/stores/batchStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HandOffRequestFormProps {
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  damageType: DamageType | null;
  damageDescription: string;
  isVehicleDrivable: 'yes' | 'no' | 'partially' | null;
  isDriverSafe: boolean;
  location: {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    description: string;
    safeForRecovery: boolean;
  };
  photos: string[];
  consignmentsSecure: boolean;
}

const STEPS = [
  { id: 'damage', title: 'Damage Type', icon: AlertTriangle },
  { id: 'status', title: 'Vehicle Status', icon: Shield },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'evidence', title: 'Evidence', icon: Camera },
  { id: 'consignments', title: 'Consignments', icon: Package },
  { id: 'review', title: 'Review', icon: CheckCircle2 }
];

export function HandOffRequestForm({ onSubmitSuccess, onCancel }: HandOffRequestFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const driver = useAuthStore(state => state.driver);
  const currentBatch = useBatchStore(state => state.currentBatch);
  const slots = useBatchStore(state => state.slots);
  
  const [formData, setFormData] = useState<FormData>({
    damageType: null,
    damageDescription: '',
    isVehicleDrivable: null,
    isDriverSafe: true,
    location: {
      lat: null,
      lng: null,
      accuracy: null,
      description: '',
      safeForRecovery: true
    },
    photos: [],
    consignmentsSecure: true
  });

  // Get pending slots from active batch
  const pendingSlots = slots.filter(s => 
    s.status === 'pending' || s.status === 'active'
  ) || [];

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Auto-capture GPS on location step
  useEffect(() => {
    if (currentStep === 2 && !formData.location.lat) {
      captureLocation();
    }
  }, [currentStep]);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        }));
        setIsLocating(false);
        toast.success('Location captured');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not get location');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return formData.damageType !== null;
      case 1: return formData.isVehicleDrivable !== null;
      case 2: return formData.location.lat !== null && formData.location.description.length > 0;
      case 3: return formData.photos.length >= 2;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel?.();
    }
  };

  const handleSubmit = async () => {
    if (!driver) {
      toast.error('No driver session');
      return;
    }

    setIsSubmitting(true);

    try {
      await createEvent({
        type: 'handoff_request',
        driver_id: driver.id,
        batch_id: currentBatch?.id,
        lat: formData.location.lat || undefined,
        lng: formData.location.lng || undefined,
        accuracy: formData.location.accuracy || undefined,
        payload: {
          damageType: formData.damageType?.id,
          damageLabel: formData.damageType?.label,
          damageDescription: formData.damageDescription,
          isVehicleDrivable: formData.isVehicleDrivable,
          isDriverSafe: formData.isDriverSafe,
          location: {
            lat: formData.location.lat,
            lng: formData.location.lng,
            accuracy: formData.location.accuracy,
            description: formData.location.description,
            safeForRecovery: formData.location.safeForRecovery
          },
          affectedSlots: pendingSlots.map(s => s.id),
          totalConsignments: pendingSlots.length,
          consignmentsSecure: formData.consignmentsSecure,
          photoCount: formData.photos.length,
          urgency: 'critical'
        }
      });

      toast.success('Hand-off request submitted', {
        description: 'Dispatch has been notified. Stay safe.'
      });

      onSubmitSuccess?.();
    } catch (error) {
      console.error('Failed to submit hand-off request:', error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Critical Request</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A hand-off will reallocate all remaining consignments to another vehicle.
                    Only use this if delivery cannot continue.
                  </p>
                </div>
              </div>
            </div>

            <Label>What type of damage or issue?</Label>
            <DamageTypeSelector
              selectedType={formData.damageType?.id || null}
              onSelect={(type) => setFormData(prev => ({ ...prev, damageType: type }))}
            />

            {formData.damageType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Label className="mt-4">Additional details (optional)</Label>
                <Textarea
                  value={formData.damageDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, damageDescription: e.target.value }))}
                  placeholder="Describe what happened..."
                  className="mt-2"
                  rows={3}
                />
              </motion.div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base">Is the vehicle drivable?</Label>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {(['yes', 'no', 'partially'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData(prev => ({ ...prev, isVehicleDrivable: option }))}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all capitalize",
                      formData.isVehicleDrivable === option
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium">Driver Safety Check</p>
                    <p className="text-sm text-muted-foreground">Are you safe and uninjured?</p>
                  </div>
                </div>
                <Switch
                  checked={formData.isDriverSafe}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDriverSafe: checked }))}
                />
              </div>
            </div>

            {!formData.isDriverSafe && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/20 border border-destructive rounded-xl p-4"
              >
                <p className="font-medium text-destructive">Emergency Services</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you need immediate medical attention, call emergency services.
                </p>
                <Button variant="destructive" className="mt-3 w-full" asChild>
                  <a href="tel:911">Call 911</a>
                </Button>
              </motion.div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span className="font-medium">GPS Location</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>
              
              {formData.location.lat ? (
                <div className="text-sm text-muted-foreground">
                  <p>Lat: {formData.location.lat.toFixed(6)}</p>
                  <p>Lng: {formData.location.lng?.toFixed(6)}</p>
                  <p className="text-xs mt-1">
                    Accuracy: ±{formData.location.accuracy?.toFixed(0)}m
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isLocating ? 'Getting location...' : 'Location not captured'}
                </p>
              )}
            </div>

            <div>
              <Label>Describe your exact location *</Label>
              <Textarea
                value={formData.location.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, description: e.target.value }
                }))}
                placeholder="e.g., Parked at Shell gas station on Main St, near the car wash"
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Safe for Vehicle Recovery?</p>
                  <p className="text-sm text-muted-foreground">
                    Can a recovery vehicle safely access this location?
                  </p>
                </div>
                <Switch
                  checked={formData.location.safeForRecovery}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, safeForRecovery: checked }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm text-warning-foreground">
                <strong>Minimum 2 photos required</strong> to document vehicle damage.
                This helps with insurance and recovery coordination.
              </p>
            </div>

            <EvidenceCapture
              photos={formData.photos}
              onPhotosChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
              maxPhotos={6}
            />

            <p className="text-sm text-muted-foreground text-center">
              {formData.photos.length}/6 photos • {formData.photos.length < 2 ? `${2 - formData.photos.length} more required` : 'Requirement met ✓'}
            </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-primary" />
                <span className="font-medium">Affected Consignments</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{pendingSlots.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Deliveries</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {slots.filter(s => s.status === 'delivered').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>

            {pendingSlots.length > 0 && (
              <div className="space-y-2">
                <Label>Pending Slots to be Transferred:</Label>
                <div className="max-h-40 overflow-auto space-y-2">
                  {pendingSlots.map((slot, idx) => (
                    <div key={slot.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                      <span className="font-medium">Slot #{idx + 1}</span>
                      <span className="text-muted-foreground ml-2">ID: {slot.id.slice(-6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">All Items Secure?</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm all consignments are safely secured in the vehicle
                  </p>
                </div>
                <Switch
                  checked={formData.consignmentsSecure}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consignmentsSecure: checked }))}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="font-medium text-destructive">Review Hand-Off Request</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please verify all information is correct before submitting.
              </p>
            </div>

            <div className="space-y-3">
              <ReviewItem 
                label="Damage Type" 
                value={formData.damageType?.label || 'Not selected'} 
              />
              <ReviewItem 
                label="Vehicle Drivable" 
                value={formData.isVehicleDrivable || 'Not specified'} 
              />
              <ReviewItem 
                label="Driver Safe" 
                value={formData.isDriverSafe ? 'Yes ✓' : 'No ⚠️'} 
              />
              <ReviewItem 
                label="Location" 
                value={formData.location.description || 'Not provided'} 
              />
              <ReviewItem 
                label="Evidence Photos" 
                value={`${formData.photos.length} photos`} 
              />
              <ReviewItem 
                label="Affected Deliveries" 
                value={`${pendingSlots.length} consignments`} 
              />
              <ReviewItem 
                label="Items Secure" 
                value={formData.consignmentsSecure ? 'Yes ✓' : 'No ⚠️'} 
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{STEPS[currentStep].title}</span>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="p-4 border-t border-border/50 bg-background">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          
          {currentStep === STEPS.length - 1 ? (
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Submit Hand-Off
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
