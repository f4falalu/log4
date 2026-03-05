// MOD4 Recipient Attestation Component
// Capture recipient name, role, and signature

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PhotoCapture } from './PhotoCapture';
import { SignatureCanvas } from './SignatureCanvas';
import { User, Briefcase, Camera, PenTool } from 'lucide-react';

interface RecipientAttestationProps {
  recipientName: string;
  recipientRole: string;
  notes: string;
  photo: string | null;
  signature: string | null;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
  onNotesChange: (notes: string) => void;
  onPhotoChange: (photo: string | null) => void;
  onSignatureChange: (signature: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function RecipientAttestation({
  recipientName,
  recipientRole,
  notes,
  photo,
  signature,
  onNameChange,
  onRoleChange,
  onNotesChange,
  onPhotoChange,
  onSignatureChange,
  onContinue,
  onBack,
}: RecipientAttestationProps) {
  const canContinue = recipientName.trim().length >= 2 && photo && signature;

  return (
    <div className="space-y-6">
      {/* Photo evidence */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Photo Evidence <span className="text-destructive">*</span>
          </h4>
        </div>
        <PhotoCapture onPhotoChange={onPhotoChange} />
      </motion.div>

      {/* Recipient details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recipient Details
          </h4>
        </div>
        
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter recipient's full name"
              value={recipientName}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-12"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Role / Title <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="e.g., Warehouse Manager, Pharmacist"
                value={recipientRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="h-12 pl-10"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Signature */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <PenTool className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Signature <span className="text-destructive">*</span>
          </h4>
        </div>
        <SignatureCanvas onSignatureChange={onSignatureChange} />
      </motion.div>

      {/* Notes (optional) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <label className="text-sm font-medium text-foreground">
          Delivery Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="Any additional notes about the delivery..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </motion.div>

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
          Continue
        </Button>
      </div>

      {!canContinue && (
        <p className="text-center text-xs text-muted-foreground">
          Photo, recipient name, and signature are required
        </p>
      )}
    </div>
  );
}