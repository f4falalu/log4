// MOD4 Location Verification Component
// GPS capture and geofence verification

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Facility, DiscrepancyReason } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MapPin, Navigation, CheckCircle2, AlertTriangle, 
  Loader2, RefreshCw, Building
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationVerificationProps {
  facility: Facility;
  location: LocationData | null;
  isProxyDelivery: boolean;
  proxyReason: string;
  proxyNotes: string;
  onLocationCapture: (location: LocationData) => void;
  onProxyReasonChange: (reason: string) => void;
  onProxyNotesChange: (notes: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const GEOFENCE_RADIUS_M = 100; // 100 meters

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const PROXY_REASONS = [
  'Delivered to adjacent building',
  'Delivered to loading dock',
  'Delivered to security checkpoint',
  'Recipient met at alternate location',
  'GPS inaccuracy',
  'Other',
];

export function LocationVerification({
  facility,
  location,
  isProxyDelivery,
  proxyReason,
  proxyNotes,
  onLocationCapture,
  onProxyReasonChange,
  onProxyNotesChange,
  onContinue,
  onBack,
}: LocationVerificationProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distance = location 
    ? calculateDistance(location.latitude, location.longitude, facility.lat, facility.lng) 
    : null;
  
  const isWithinGeofence = distance !== null && distance <= GEOFENCE_RADIUS_M;
  const requiresProxyJustification = !isWithinGeofence && location !== null;
  
  const canContinue = location !== null && (
    isWithinGeofence || 
    (requiresProxyJustification && proxyReason && proxyNotes.trim().length >= 10)
  );

  const captureLocation = () => {
    setIsCapturing(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsCapturing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationCapture({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsCapturing(false);
      },
      (err) => {
        setError(`Unable to retrieve location: ${err.message}`);
        setIsCapturing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    // Auto-capture on mount if no location
    if (!location) {
      captureLocation();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Facility info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
        <Building className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {facility.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {facility.address}
          </p>
        </div>
      </div>

      {/* Location status */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Location Verification
        </h4>

        {!location ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-xl bg-secondary/50 border border-border/50 text-center"
          >
            {isCapturing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Capturing GPS location...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureLocation}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : (
              <Button onClick={captureLocation}>
                <Navigation className="w-4 h-4 mr-2" />
                Capture Location
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-4 rounded-xl border",
              isWithinGeofence 
                ? "bg-success/10 border-success/30" 
                : "bg-warning/10 border-warning/30"
            )}
          >
            <div className="flex items-start gap-3">
              {isWithinGeofence ? (
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-semibold",
                  isWithinGeofence ? "text-success" : "text-warning"
                )}>
                  {isWithinGeofence ? 'Within delivery zone' : 'Outside expected zone'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {distance !== null && (
                    <>Distance: {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(2)}km`} • </>
                  )}
                  Accuracy: ±{Math.round(location.accuracy)}m
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={captureLocation}
                disabled={isCapturing}
              >
                <RefreshCw className={cn("w-4 h-4", isCapturing && "animate-spin")} />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Proxy delivery form */}
      {requiresProxyJustification && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Proxy Delivery Required
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                You are outside the expected delivery zone. Please provide a reason.
              </p>
            </div>
          </div>

          {/* Reason selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Reason <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROXY_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => onProxyReasonChange(reason)}
                  className={cn(
                    "p-3 text-left text-sm rounded-lg border transition-colors",
                    proxyReason === reason
                      ? "bg-primary/10 border-primary/50 text-foreground"
                      : "bg-card border-border/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Details <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Provide additional details about the delivery location..."
              value={proxyNotes}
              onChange={(e) => onProxyNotesChange(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {proxyNotes.length}/10 minimum characters
            </p>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          className="flex-1 h-12 font-semibold"
          onClick={onContinue}
          disabled={!canContinue}
        >
          Review & Confirm
        </Button>
      </div>
    </div>
  );
}