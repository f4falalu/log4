/**
 * Auth Page - Modern Multi-Step Registration/Login
 *
 * Features:
 * - Dark theme with gradient accents
 * - Multi-step registration flow
 * - Social login options (Google, Microsoft)
 * - Smooth transitions between steps
 * - Profile preview on desktop
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Briefcase,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

// Validation schemas
const emailPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type AuthMode = 'login' | 'signup';
type SignupStep = 'credentials' | 'profile' | 'complete';

interface FormData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  organization: string;
  role: string;
}

// Google icon SVG component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Microsoft icon SVG component
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

// Logo component
function BIKOLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
        <Building2 className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-semibold text-white">BIKO</span>
    </div>
  );
}

// Gradient orb for visual interest
function GradientOrb() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-30 pointer-events-none">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-orange-400/40 blur-3xl" />
    </div>
  );
}

export default function Auth() {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState<SignupStep>('credentials');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    organization: '',
    role: '',
  });

  // Check for invitation token in URL
  const inviteToken = searchParams.get('invite');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (inviteToken) {
        navigate(`/invite/${inviteToken}`);
      } else {
        navigate('/');
      }
    }
  }, [user, navigate, inviteToken]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Google Sign In Failed', { description: error.message });
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      emailPasswordSchema.parse({
        email: formData.email,
        password: formData.password,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        toast.error('Login Failed', { description: error.message });
      } else {
        if (inviteToken) {
          navigate(`/invite/${inviteToken}`);
        } else {
          navigate('/');
        }
      }
    } catch {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsNext = () => {
    try {
      emailPasswordSchema.parse({
        email: formData.email,
        password: formData.password,
      });
      setErrors({});
      setStep('profile');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleSignup = async () => {
    try {
      profileSchema.parse({
        fullName: formData.fullName,
        phone: formData.phone,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone || undefined
      );

      if (error) {
        toast.error('Signup Failed', { description: error.message });
      } else {
        setStep('complete');
        toast.success('Account Created', {
          description: 'Please check your email to verify your account.',
        });
      }
    } catch {
      toast.error('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setMode('login');
    setStep('credentials');
    setErrors({});
  };

  const switchToSignup = () => {
    setMode('signup');
    setStep('credentials');
    setErrors({});
  };

  // Render login form
  const renderLogin = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
        <p className="text-zinc-400">Sign in to your account to continue.</p>
      </div>

      {/* Social Login */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon className="w-5 h-5 mr-3" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white"
          disabled={loading}
        >
          <MicrosoftIcon className="w-5 h-5 mr-3" />
          Continue with Microsoft
        </Button>
      </div>

      <div className="relative">
        <Separator className="bg-zinc-800" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-4 text-xs text-zinc-500 uppercase">
          or
        </span>
      </div>

      {/* Email/Password */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={cn(
                'h-12 pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20',
                errors.email && 'border-red-500'
              )}
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-300">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={cn(
                'h-12 pl-11 pr-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20',
                errors.password && 'border-red-500'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
        </div>
      </div>

      <Button
        onClick={handleLogin}
        disabled={loading}
        className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <button onClick={switchToSignup} className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign up
        </button>
      </p>
    </div>
  );

  // Render signup step 1: credentials
  const renderCredentialsStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">
          Welcome to <span className="text-emerald-400">BIKO.</span>
        </h1>
        <p className="text-zinc-400">Let&apos;s create your new account to get started.</p>
      </div>

      {/* Social Login */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon className="w-5 h-5 mr-3" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white"
          disabled={loading}
        >
          <MicrosoftIcon className="w-5 h-5 mr-3" />
          Continue with Microsoft
        </Button>
      </div>

      <div className="relative">
        <Separator className="bg-zinc-800" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-4 text-xs text-zinc-500 uppercase">
          or
        </span>
      </div>

      {/* Email/Password */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-zinc-300">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="signup-email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={cn(
                'h-12 pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20',
                errors.email && 'border-red-500'
              )}
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-zinc-300">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className={cn(
                'h-12 pl-11 pr-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20',
                errors.password && 'border-red-500'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
          <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
        </div>
      </div>

      <Button
        onClick={handleCredentialsNext}
        className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-medium"
      >
        Continue with Email
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>

      <div className="space-y-4">
        <p className="text-center text-xs text-zinc-500">
          By continuing, you agree to our{' '}
          <a href="#" className="text-emerald-400 hover:underline">
            Terms of Service
          </a>{' '}
          &{' '}
          <a href="#" className="text-emerald-400 hover:underline">
            Privacy Policy
          </a>
        </p>

        <p className="text-center text-sm text-zinc-500">
          Already signed up?{' '}
          <button onClick={switchToLogin} className="text-emerald-400 hover:text-emerald-300 font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );

  // Render signup step 2: profile
  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <button
          onClick={() => setStep('credentials')}
          className="flex items-center text-zinc-400 hover:text-zinc-200 text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-3xl font-semibold text-white">Complete your profile</h1>
        <p className="text-zinc-400">Tell us a bit about yourself.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-emerald-500" />
        <div className="flex-1 h-1 rounded-full bg-emerald-500" />
        <div className="flex-1 h-1 rounded-full bg-zinc-800" />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-zinc-300">
            Full name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="fullName"
              type="text"
              placeholder="Your display name"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className={cn(
                'h-12 pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20',
                errors.fullName && 'border-red-500'
              )}
            />
          </div>
          {errors.fullName && <p className="text-sm text-red-400">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-zinc-300">
            Phone number{' '}
            <span className="text-zinc-600">(optional)</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="h-12 pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization" className="text-zinc-300">
            Organization{' '}
            <span className="text-zinc-600">(optional)</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="organization"
              type="text"
              placeholder="Your company or organization"
              value={formData.organization}
              onChange={(e) => updateField('organization', e.target.value)}
              className="h-12 pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-zinc-300">
            Your role{' '}
            <span className="text-zinc-600">(optional)</span>
          </Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              id="role"
              type="text"
              placeholder="e.g., Operations Manager, Fleet Supervisor"
              value={formData.role}
              onChange={(e) => updateField('role', e.target.value)}
              className="h-12 pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSignup}
        disabled={loading}
        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );

  // Render signup complete
  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">You&apos;re all set!</h1>
        <p className="text-zinc-400">
          We&apos;ve sent a verification email to <strong className="text-white">{formData.email}</strong>
        </p>
      </div>

      <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-left space-y-3">
        <h3 className="font-medium text-white">Next steps:</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">1.</span>
            Check your email and click the verification link
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">2.</span>
            Sign in to access your dashboard
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">3.</span>
            Set up your workspace or accept an invitation
          </li>
        </ul>
      </div>

      <Button
        onClick={switchToLogin}
        className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-medium"
      >
        Sign In
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );

  // Render current step
  const renderStep = () => {
    if (mode === 'login') {
      return renderLogin();
    }

    switch (step) {
      case 'credentials':
        return renderCredentialsStep();
      case 'profile':
        return renderProfileStep();
      case 'complete':
        return renderComplete();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[480px] min-h-screen flex flex-col p-8 relative overflow-hidden">
        <GradientOrb />

        <div className="relative z-10 flex-1 flex flex-col">
          {/* Logo */}
          <BIKOLogo className="mb-12" />

          {/* Form Content */}
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-sm mx-auto lg:mx-0">{renderStep()}</div>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <div className="h-1 w-32 rounded-full bg-gradient-to-r from-zinc-800 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right Panel - Preview (Desktop only) */}
      <div className="hidden lg:flex flex-1 bg-zinc-900/50 border-l border-zinc-800 items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-lg">
          {/* Preview Card */}
          <div className="rounded-2xl bg-zinc-900/80 backdrop-blur border border-zinc-800 overflow-hidden">
            {/* Header with gradient */}
            <div className="h-32 bg-gradient-to-br from-purple-500/60 via-pink-500/60 to-orange-400/60 relative">
              <div className="absolute -bottom-8 left-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 border-4 border-zinc-900" />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 pt-12 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {formData.fullName || 'Your Name'}
                </h3>
                <p className="text-zinc-500">{formData.email || 'your@email.com'}</p>
              </div>

              {formData.organization && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Building2 className="w-4 h-4" />
                  <span>{formData.organization}</span>
                </div>
              )}

              {formData.role && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Briefcase className="w-4 h-4" />
                  <span>{formData.role}</span>
                </div>
              )}

              {/* Feature highlights */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <p className="text-sm text-zinc-500">What you can do with BIKO:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Fleet Management', 'Route Planning', 'Driver Tracking', 'Analytics'].map((feature) => (
                    <div
                      key={feature}
                      className="px-3 py-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-300"
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-center text-zinc-500 mt-8">
            Integrated Operations Platform for modern logistics
          </p>
        </div>
      </div>
    </div>
  );
}
