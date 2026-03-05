// MOD4 Account Activation
// Multi-step wizard: OTP → PIN → Permissions

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  MapPin,
  Camera,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

type Step = 'otp' | 'pin' | 'done';

export default function ActivateAccount() {
  const [step, setStep] = useState<Step>('otp');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otpError, setOtpError] = useState('');
  const [pinError, setPinError] = useState('');
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);

  const { activateWithOTP, setPIN, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Step 1: Verify OTP
  const handleOtpSubmit = async () => {
    if (otp.length !== 6) return;
    setOtpError('');

    const result = await activateWithOTP(otp, otp);
    // The identifier is the OTP itself for the RPC — but actually
    // the driver may not know their email. The verify_mod4_otp RPC
    // accepts email or phone. For OTP-only activation, we pass
    // the OTP as both identifier and code — but the RPC needs the email.
    //
    // Actually, the driver needs to provide their email/phone so the
    // backend can find the right OTP record. Let's handle this properly.
  };

  // We need the driver's email or phone to look up the OTP
  const [identifier, setIdentifier] = useState('');

  const handleOtpVerify = async () => {
    if (otp.length !== 6 || !identifier.trim()) return;
    setOtpError('');

    const result = await activateWithOTP(identifier.trim(), otp);

    if (!result.success) {
      setOtpError(result.error || 'Invalid or expired code');
      return;
    }

    toast.success('Account verified');
    setStep('pin');
  };

  // Step 2: Set PIN
  const handlePinSubmit = async () => {
    setPinError('');

    if (pin.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    const result = await setPIN(pin, displayName || undefined);

    if (!result.success) {
      setPinError(result.error || 'Failed to set PIN');
      return;
    }

    toast.success('PIN set successfully');
    setStep('done');
  };

  // Step 3: Request permissions
  const requestGPS = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'granted') {
        setGpsGranted(true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => setGpsGranted(true),
        () => setGpsGranted(false)
      );
    } catch {
      setGpsGranted(false);
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden safe-top safe-bottom">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50 via-yellow-50 to-white dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-background" />

      {/* Header */}
      <div className="relative z-10 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'otp') navigate('/login');
            else if (step === 'pin') setStep('otp');
          }}
          disabled={step === 'done'}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center relative z-10 px-6 pb-8">
        <div className="max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* ========================= STEP 1: OTP ========================= */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                    <KeyRound className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Enter Activation Code
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Your admin will provide a 6-digit code along with your email or phone number.
                  </p>
                </div>

                {/* Identifier input */}
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Phone Number</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="driver@example.com or +234..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="text-center"
                    autoComplete="email"
                  />
                </div>

                {/* OTP input */}
                <div className="flex flex-col items-center space-y-4">
                  <Label>Activation Code</Label>
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <span className="mx-2 text-muted-foreground">-</span>
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  {otpError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive text-center"
                    >
                      {otpError}
                    </motion.p>
                  )}
                </div>

                <Button
                  onClick={handleOtpVerify}
                  disabled={otp.length !== 6 || !identifier.trim() || isLoading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
              </motion.div>
            )}

            {/* ========================= STEP 2: PIN ========================= */}
            {step === 'pin' && (
              <motion.div
                key="pin"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Create Your PIN
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    You'll use this 4-digit PIN to sign in on this device.
                  </p>
                </div>

                {/* Display name */}
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name (optional)</Label>
                  <Input
                    id="display-name"
                    type="text"
                    placeholder="e.g. Musa"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                {/* PIN */}
                <div className="flex flex-col items-center space-y-2">
                  <Label>Enter PIN</Label>
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={pin}
                    onChange={(v) => { setPin(v); setPinError(''); }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Confirm PIN */}
                <div className="flex flex-col items-center space-y-2">
                  <Label>Confirm PIN</Label>
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={confirmPin}
                    onChange={(v) => { setConfirmPin(v); setPinError(''); }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {pinError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive text-center"
                  >
                    {pinError}
                  </motion.p>
                )}

                <Button
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4 || confirmPin.length !== 4 || isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting PIN...
                    </>
                  ) : (
                    'Set PIN'
                  )}
                </Button>
              </motion.div>
            )}

            {/* ========================= STEP 3: DONE ========================= */}
            {step === 'done' && (
              <motion.div
                key="done"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    You're All Set!
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Your account is activated and this device is registered.
                  </p>
                </div>

                {/* Permissions */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">Grant permissions for delivery execution:</p>

                  <button
                    onClick={requestGPS}
                    className="w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">GPS Location</p>
                        <p className="text-xs text-muted-foreground">Required for tracking</p>
                      </div>
                    </div>
                    {gpsGranted === null ? (
                      <span className="text-xs text-muted-foreground">Tap to enable</span>
                    ) : gpsGranted ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </button>

                  <button
                    onClick={requestCamera}
                    className="w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Camera className="h-5 w-5 text-purple-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Camera</p>
                        <p className="text-xs text-muted-foreground">For proof of delivery photos</p>
                      </div>
                    </div>
                    {cameraGranted === null ? (
                      <span className="text-xs text-muted-foreground">Tap to enable</span>
                    ) : cameraGranted ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                  </button>
                </div>

                <Button
                  onClick={() => navigate('/')}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl"
                >
                  Get Started
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {(['otp', 'pin', 'done'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${
                  s === step
                    ? 'bg-primary w-8'
                    : i < ['otp', 'pin', 'done'].indexOf(step)
                      ? 'bg-primary/50 w-4'
                      : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
