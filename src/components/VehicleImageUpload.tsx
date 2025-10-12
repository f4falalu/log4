import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VehicleImageUploadProps {
  vehicleType: string;
  model: string;
  plateNumber: string;
  currentPhotoUrl?: string;
  onImageGenerated: (photoUrl: string, thumbnailUrl: string, aiGenerated: boolean) => void;
}

export const VehicleImageUpload = ({
  vehicleType,
  model,
  plateNumber,
  currentPhotoUrl,
  onImageGenerated,
}: VehicleImageUploadProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);

  const handleGenerate = async () => {
    if (!vehicleType || !model) {
      toast.error('Please select vehicle type and model first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vehicle-image', {
        body: { vehicleType, model, plateNumber }
      });

      if (error) throw error;

      setPreviewUrl(data.photo_url);
      onImageGenerated(data.photo_url, data.thumbnail_url, true);
      toast.success('Vehicle image generated successfully!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const filename = `${plateNumber || 'vehicle'}-${timestamp}.${file.name.split('.').pop()}`;

      const { data, error } = await supabase.storage
        .from('vehicle-photos')
        .upload(filename, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(filename);

      setPreviewUrl(publicUrl);
      onImageGenerated(publicUrl, publicUrl, false);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Vehicle Image</Label>
      
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="text-sm text-muted-foreground">
              <p><strong>Type:</strong> {vehicleType || 'Not selected'}</p>
              <p><strong>Model:</strong> {model || 'Not selected'}</p>
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !vehicleType || !model}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Vehicle Image
                </>
              )}
            </Button>

            {previewUrl && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img
                  src={previewUrl}
                  alt="Vehicle preview"
                  className="w-full aspect-[16/9] object-contain rounded-lg border bg-muted/10 p-4"
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}

            {previewUrl && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <img
                  src={previewUrl}
                  alt="Vehicle preview"
                  className="w-full aspect-[16/9] object-contain rounded-lg border bg-muted/10 p-4"
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
