/**
 * AI Dimension Assistant - Multi-View Upload
 * Upload Front, Side, Rear, and Interior photos for AI-powered dimension estimation.
 * Any combination of views can be uploaded; more views = higher confidence.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Sparkles, Loader2, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AiDimensionButtonProps {
  onAnalysisComplete: (analysis: any) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

type ViewAngle = 'front' | 'side' | 'rear' | 'interior';

interface ViewConfig {
  key: ViewAngle;
  label: string;
  description: string;
}

const VIEW_CONFIGS: ViewConfig[] = [
  { key: 'front', label: 'Front', description: 'Front view of vehicle' },
  { key: 'side', label: 'Side', description: 'Side profile view' },
  { key: 'rear', label: 'Rear', description: 'Rear / cargo door view' },
  { key: 'interior', label: 'Interior', description: 'Cargo area interior' },
];

export function AiDimensionButton({
  onAnalysisComplete,
  isProcessing,
  onProcessingChange,
}: AiDimensionButtonProps) {
  const [selectedFiles, setSelectedFiles] = useState<Record<ViewAngle, File | null>>({
    front: null,
    side: null,
    rear: null,
    interior: null,
  });
  const [previews, setPreviews] = useState<Record<ViewAngle, string | null>>({
    front: null,
    side: null,
    rear: null,
    interior: null,
  });
  const fileInputRefs = useRef<Record<ViewAngle, HTMLInputElement | null>>({
    front: null,
    side: null,
    rear: null,
    interior: null,
  });

  const uploadedCount = Object.values(selectedFiles).filter(Boolean).length;
  const hasAnyFile = uploadedCount > 0;

  const handleFileSelect = (view: ViewAngle, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (JPG, PNG, etc.)',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please upload an image smaller than 5MB',
      });
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [view]: file }));

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews((prev) => ({ ...prev, [view]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (view: ViewAngle) => {
    setSelectedFiles((prev) => ({ ...prev, [view]: null }));
    setPreviews((prev) => ({ ...prev, [view]: null }));
    const input = fileInputRefs.current[view];
    if (input) input.value = '';
  };

  const processAllImages = async () => {
    if (!hasAnyFile) return;

    onProcessingChange(true);

    try {
      // Convert all selected files to base64
      const imagePayload: Record<string, string> = {};
      for (const [view, file] of Object.entries(selectedFiles)) {
        if (file) {
          imagePayload[view] = await fileToBase64(file);
        }
      }

      // Call AI capacity estimation edge function with multiple views
      const { data, error } = await supabase.functions.invoke('ai-capacity-estimation', {
        body: {
          images: imagePayload,
          views: Object.keys(imagePayload),
          method: 'vision-multi',
        },
      });

      if (error) throw error;

      if (data && data.success) {
        const analysis = {
          dimensions_cm: data.dimensions || estimateDimensions(data.capacity_volume_m3),
          volume_m3: data.capacity_volume_m3 || 10,
          max_payload_kg: data.capacity_weight_kg || 1000,
          recommended_tiers: data.recommended_tiers || 3,
          recommended_slots: data.recommended_slots || {
            upper: 3,
            middle: 3,
            lower: 3,
          },
          confidence: data.confidence || 0.75,
          views_analyzed: Object.keys(imagePayload).length,
        };

        onAnalysisComplete(analysis);

        toast.success('AI Analysis Complete', {
          description: `Analyzed ${analysis.views_analyzed} view${analysis.views_analyzed > 1 ? 's' : ''} — Volume: ${analysis.volume_m3.toFixed(2)} m³, Payload: ${analysis.max_payload_kg} kg (${Math.round(analysis.confidence * 100)}% confidence)`,
        });

        // Clear files after successful analysis
        setSelectedFiles({ front: null, side: null, rear: null, interior: null });
        setPreviews({ front: null, side: null, rear: null, interior: null });
      } else {
        throw new Error('No analysis data returned');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('AI Analysis Failed', {
        description:
          error instanceof Error
            ? error.message
            : 'Unable to analyze vehicle images. Please enter dimensions manually.',
      });
    } finally {
      onProcessingChange(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 2x2 Grid of Upload Zones */}
      <div className="grid grid-cols-2 gap-2">
        {VIEW_CONFIGS.map((view) => {
          const file = selectedFiles[view.key];
          const preview = previews[view.key];

          return (
            <div key={view.key} className="relative">
              <input
                ref={(el) => { fileInputRefs.current[view.key] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(view.key, e)}
              />

              {preview ? (
                /* Uploaded preview */
                <div className="relative group rounded-lg overflow-hidden border border-primary/30 bg-muted/20">
                  <img
                    src={preview}
                    alt={`${view.label} view`}
                    className="w-full h-20 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeFile(view.key)}
                      className="p-1 rounded-full bg-white/90 text-destructive hover:bg-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/50 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-medium text-white">{view.label}</span>
                  </div>
                </div>
              ) : (
                /* Empty upload placeholder */
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[view.key]?.click()}
                  disabled={isProcessing}
                  className="w-full h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4 text-muted-foreground/60" />
                  <span className="text-[10px] font-medium text-muted-foreground/70">
                    {view.label}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload count & process button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={processAllImages}
          disabled={isProcessing || !hasAnyFile}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing {uploadedCount} view{uploadedCount !== 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {hasAnyFile
                ? `Analyze ${uploadedCount} view${uploadedCount !== 1 ? 's' : ''}`
                : 'Upload photos to analyze'}
            </>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center leading-tight">
        Upload Front, Side, Rear &amp; Interior photos for AI-powered auto-configuration.
        More views = higher accuracy.
      </p>
    </div>
  );
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Estimate dimensions from volume (fallback when AI doesn't return dimensions)
 */
function estimateDimensions(volumeM3: number): { length: number; width: number; height: number } {
  const cubeRoot = Math.cbrt(volumeM3);
  return {
    length: Math.round(cubeRoot * 200 * 100),
    width: Math.round(cubeRoot * 100 * 100),
    height: Math.round(cubeRoot * 120 * 100),
  };
}
