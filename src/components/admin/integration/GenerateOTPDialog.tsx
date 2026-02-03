import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, Mail, Copy, Check } from 'lucide-react';
import { useGenerateOTP } from '@/hooks/admin/useIntegration';

interface GenerateOTPDialogProps {
  workspaceId: string;
  trigger?: React.ReactNode;
}

export function GenerateOTPDialog({ workspaceId, trigger }: GenerateOTPDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateOTP = useGenerateOTP();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const otp = await generateOTP.mutateAsync({ email, workspaceId });
      setGeneratedOTP(otp);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    if (!generatedOTP) return;
    await navigator.clipboard.writeText(generatedOTP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail('');
      setGeneratedOTP(null);
      setCopied(false);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <KeyRound className="h-4 w-4 mr-2" />
            Generate OTP
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        {generatedOTP ? (
          <>
            <DialogHeader>
              <DialogTitle>OTP Code Generated</DialogTitle>
              <DialogDescription>
                Share this code with the driver for <strong>{email}</strong>.
                It expires in 15 minutes.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-mono font-bold tracking-[0.5em] text-center select-all">
                  {generatedOTP}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                The driver enters this code in their Mod4 app to link their account.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Generate OTP Code</DialogTitle>
              <DialogDescription>
                Generate a one-time passcode for a driver to link their account to Mod4.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="otp-email">Driver Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="driver@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A 6-digit code will be generated. Share it with the driver verbally or via secure channel.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!email || generateOTP.isPending}>
                {generateOTP.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
