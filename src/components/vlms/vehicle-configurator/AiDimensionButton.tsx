/**
 * AI Dimension Assistant Button
 * Allows users to upload a vehicle photo for AI-powered dimension estimation
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AiDimensionButtonProps {
  onAnalysisComplete: (analysis: any) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

export function AiDimensionButton({
  onAnalysisComplete,
  isProcessing,
  onProcessingChange,
}: AiDimensionButtonProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    processImage(file);
  };

  const processImage = async (file: File) => {
    onProcessingChange(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Call AI capacity estimation edge function
      const { data, error } = await supabase.functions.invoke('ai-capacity-estimation', {
        body: {
          image: base64,
          method: 'vision', // Use AI vision analysis
        },
      });

      if (error) throw error;

      if (data && data.success) {
        // Simulate dimension breakdown (enhance this when AI function returns dimensions)
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
        };

        onAnalysisComplete(analysis);

        toast({
          title: 'AI Analysis Complete',
          description: (
            <div className="space-y-1">
              <p>Volume: {analysis.volume_m3.toFixed(2)} m³</p>
              <p>Payload: {analysis.max_payload_kg} kg</p>
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round(analysis.confidence * 100)}%
              </p>
            </div>
          ),
        });
      } else {
        throw new Error('No analysis data returned');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: 'AI Analysis Failed',
        description: error instanceof Error ? error.message : 'Unable to analyze vehicle image. Please enter dimensions manually.',
        variant: 'destructive',
      });
    } finally {
      onProcessingChange(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleButtonClick}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing image...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-fill using vehicle photo
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Upload a side-profile photo for AI-powered dimension estimation
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
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Estimate dimensions from volume (simple cubic root approach)
 * This is a fallback when AI doesn't return dimensions
 */
function estimateDimensions(volumeM3: number): { length: number; width: number; height: number } {
  // Assume typical truck/van proportions (2:1:1.2 ratio)
  const cubeRoot = Math.cbrt(volumeM3);

  return {
    length: Math.round(cubeRoot * 200 * 100), // Convert to cm, adjust for length
    width: Math.round(cubeRoot * 100 * 100), // Convert to cm
    height: Math.round(cubeRoot * 120 * 100), // Convert to cm, adjust for height
  };
}
