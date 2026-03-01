// MOD4 Request Access
// Driver-initiated onboarding request (no identity created)

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export default function RequestAccess() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { requestAccess, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim()) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    const result = await requestAccess(
      fullName.trim(),
      phone.trim(),
      email.trim() || undefined,
      organization.trim() || undefined
    );

    if (result.success) {
      setSubmitted(true);
    } else {
      toast.error(result.error || 'Failed to submit request');
    }
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
          onClick={() => navigate('/login')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center relative z-10 px-6 pb-8">
        <div className="max-w-sm mx-auto w-full">
          {submitted ? (
            /* ============ SUCCESS STATE ============ */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 text-center"
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Request Submitted
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your onboarding request has been sent to the admin team.
                  They will review your details and provide an activation code.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-card">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">{phone}</p>
                {email && <p className="text-xs text-muted-foreground">{email}</p>}
              </div>

              <p className="text-xs text-muted-foreground">
                Once approved, you'll receive an activation code via SMS or email.
                Use the <strong>Activate Account</strong> option to complete setup.
              </p>

              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full h-12 rounded-xl font-semibold"
              >
                Back to Login
              </Button>
            </motion.div>
          ) : (
            /* ============ REQUEST FORM ============ */
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                    <UserPlus className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Request Driver Access
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Submit your details and an admin will review your request.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name *</Label>
                    <Input
                      id="full-name"
                      type="text"
                      placeholder="e.g. Musa Ibrahim"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g. +234 801 234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g. musa@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Organization */}
                  <div className="space-y-2">
                    <Label htmlFor="organization">
                      Organization <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="organization"
                      type="text"
                      placeholder="e.g. Biko Logistics Kano"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!fullName.trim() || !phone.trim() || isLoading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
