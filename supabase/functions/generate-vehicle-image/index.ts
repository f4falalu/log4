import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleType, model, plateNumber } = await req.json();
    
    if (!vehicleType || !model) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: vehicleType and model' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating image for ${vehicleType} - ${model}`);

    // Generate detailed prompt for realistic vehicle image with strict side view requirements
    const prompt = `Professional photograph of a ${model} ${vehicleType} commercial delivery vehicle. 
STRICT REQUIREMENTS:
- Perfect 90-degree side profile view (horizontal orientation)
- Vehicle facing right, parallel to camera
- Complete vehicle visible from front to back
- Clean white or light gray background
- Vehicle centered in frame
- Studio lighting, realistic, high detail
- Landscape orientation (16:9 aspect ratio)
- Professional product photography style
Do NOT show 3/4 view, angled view, or front view. Must be pure side profile.`;

    // Call Lovable AI to generate image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate image', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const base64Image = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!base64Image) {
      throw new Error('No image returned from AI');
    }

    // Extract base64 data (remove "data:image/png;base64," prefix if present)
    const base64Data = base64Image.split(',')[1] || base64Image;
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${vehicleType}-${timestamp}.png`;
    const thumbnailFilename = `${vehicleType}-${timestamp}-thumb.png`;

    // Upload original image to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle-photos')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Upload thumbnail (same image for now - client can handle resizing if needed)
    await supabase.storage
      .from('vehicle-photos')
      .upload(thumbnailFilename, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    // Get public URLs
    const { data: { publicUrl: photoUrl } } = supabase.storage
      .from('vehicle-photos')
      .getPublicUrl(filename);

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('vehicle-photos')
      .getPublicUrl(thumbnailFilename);

    console.log('Image generated and uploaded successfully');

    return new Response(
      JSON.stringify({
        photo_url: photoUrl,
        thumbnail_url: thumbnailUrl,
        ai_generated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-vehicle-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
