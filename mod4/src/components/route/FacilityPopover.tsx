import { Facility } from '@/lib/db/schema';
import { MapPin, Phone, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface FacilityPopoverProps {
  facility: Facility;
  position: { x: number; y: number };
  onClose: () => void;
  onNavigate: (facility: Facility) => void;
}

export function FacilityPopover({ 
  facility, 
  position, 
  onClose, 
  onNavigate 
}: FacilityPopoverProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      className="absolute z-40 w-72 bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)',
      }}
    >
      {/* Arrow pointer */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-background border-r border-b border-border rotate-45"
      />

      <div className="p-4 relative">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 w-6 h-6"
          onClick={onClose}
        >
          <X className="w-3 h-3" />
        </Button>

        {/* Facility header */}
        <div className="flex items-start gap-3 mb-3 pr-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
              {facility.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {facility.address}
            </p>
          </div>
        </div>

        {/* Contact info */}
        {facility.contact_name && (
          <div className="p-2.5 rounded-lg bg-secondary/50 mb-3">
            <p className="text-xs font-medium text-foreground">
              {facility.contact_name}
            </p>
            {facility.contact_phone && (
              <a 
                href={`tel:${facility.contact_phone}`}
                className="text-xs text-primary hover:underline"
              >
                {facility.contact_phone}
              </a>
            )}
          </div>
        )}

        {/* Instructions */}
        {facility.instructions && (
          <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 mb-3">
            <p className="text-xs text-foreground line-clamp-2">
              {facility.instructions}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs font-medium"
            onClick={() => onNavigate(facility)}
          >
            <ExternalLink className="w-3 h-3 mr-1.5" />
            Start In-App Nav
          </Button>
          
          {facility.contact_phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs font-medium"
              onClick={() => window.open(`tel:${facility.contact_phone}`, '_self')}
            >
              <Phone className="w-3 h-3 mr-1.5" />
              Call
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
