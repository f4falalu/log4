import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CapacityEstimationRequest {
  vehicleId: string;
  imageUrl?: string;
  vehicleType: 'car' | 'van' | 'truck' | 'pickup';
  model?: string;
}

interface CapacityEstimationResponse {
  vehicleId: string;
  estimatedVolumeM3: number;
  estimatedWeightKg: number;
  confidence: number;
  method: 'ai_vision' | 'model_lookup' | 'type_default';
  details: {
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    loadingArea?: {
      volume: number;
      maxWeight: number;
    };
    aiAnalysis?: {
      detectedFeatures: string[];
      confidenceScore: number;
    };
  };
}

// Default capacity values based on vehicle types (fallback)
const DEFAULT_CAPACITIES = {
  car: { volume: 1.5, weight: 500 },
  van: { volume: 8.0, weight: 2000 },
  truck: { volume: 15.0, weight: 5000 },
  pickup: { volume: 3.0, weight: 1000 }
};

// Model-specific capacity database (simplified)
const MODEL_CAPACITIES: Record<string, { volume: number; weight: number }> = {
  'toyota hiace': { volume: 8.2, weight: 2200 },
  'isuzu npr': { volume: 15.5, weight: 5200 },
  'ford transit': { volume: 10.3, weight: 2800 },
  'mercedes sprinter': { volume: 11.5, weight: 3200 },
  'nissan nv200': { volume: 4.2, weight: 1200 },
  'iveco daily': { volume: 12.8, weight: 3500 }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { vehicleId, imageUrl, vehicleType, model }: CapacityEstimationRequest = await req.json()

    let estimation: CapacityEstimationResponse;

    // Method 1: AI Vision Analysis (if image provided)
    if (imageUrl) {
      estimation = await performAIVisionAnalysis(vehicleId, imageUrl, vehicleType);
    }
    // Method 2: Model-based lookup
    else if (model && MODEL_CAPACITIES[model.toLowerCase()]) {
      const modelData = MODEL_CAPACITIES[model.toLowerCase()];
      estimation = {
        vehicleId,
        estimatedVolumeM3: modelData.volume,
        estimatedWeightKg: modelData.weight,
        confidence: 0.85,
        method: 'model_lookup',
        details: {
          loadingArea: {
            volume: modelData.volume,
            maxWeight: modelData.weight
          }
        }
      };
    }
    // Method 3: Type-based defaults
    else {
      const defaultData = DEFAULT_CAPACITIES[vehicleType];
      estimation = {
        vehicleId,
        estimatedVolumeM3: defaultData.volume,
        estimatedWeightKg: defaultData.weight,
        confidence: 0.6,
        method: 'type_default',
        details: {
          loadingArea: {
            volume: defaultData.volume,
            maxWeight: defaultData.weight
          }
        }
      };
    }

    // Update vehicle record with AI estimation
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({
        capacity_volume_m3: estimation.estimatedVolumeM3,
        capacity_weight_kg: estimation.estimatedWeightKg,
        ai_capacity_image_url: imageUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId);

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
    }

    // Log the estimation for analytics
    await logCapacityEstimation(supabase, estimation);

    return new Response(
      JSON.stringify(estimation),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in AI capacity estimation:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function performAIVisionAnalysis(
  vehicleId: string, 
  imageUrl: string, 
  vehicleType: string
): Promise<CapacityEstimationResponse> {
  // Simulated AI vision analysis
  // In a real implementation, this would use:
  // - Computer vision models (ONNX Runtime, TensorFlow.js)
  // - Image processing libraries
  // - Machine learning models trained on vehicle capacity data

  console.log(`Performing AI vision analysis for vehicle ${vehicleId}`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate AI analysis results with some randomization for demo
  const baseCapacity = DEFAULT_CAPACITIES[vehicleType as keyof typeof DEFAULT_CAPACITIES];
  const variationFactor = 0.8 + Math.random() * 0.4; // 80% to 120% of base
  
  const estimatedVolume = baseCapacity.volume * variationFactor;
  const estimatedWeight = baseCapacity.weight * variationFactor;
  const confidence = 0.75 + Math.random() * 0.2; // 75% to 95% confidence

  // Simulated detected features
  const detectedFeatures = [
    'cargo_area_detected',
    'loading_door_identified',
    'roof_height_measured',
    'wheel_base_calculated'
  ];

  return {
    vehicleId,
    estimatedVolumeM3: Math.round(estimatedVolume * 100) / 100,
    estimatedWeightKg: Math.round(estimatedWeight),
    confidence: Math.round(confidence * 100) / 100,
    method: 'ai_vision',
    details: {
      dimensions: {
        length: 4.5 + Math.random() * 2, // 4.5-6.5m
        width: 1.8 + Math.random() * 0.4, // 1.8-2.2m
        height: 1.8 + Math.random() * 0.7  // 1.8-2.5m
      },
      loadingArea: {
        volume: estimatedVolume,
        maxWeight: estimatedWeight
      },
      aiAnalysis: {
        detectedFeatures,
        confidenceScore: confidence
      }
    }
  };
}

async function logCapacityEstimation(supabase: any, estimation: CapacityEstimationResponse) {
  try {
    await supabase
      .from('capacity_estimation_logs')
      .insert({
        vehicle_id: estimation.vehicleId,
        method: estimation.method,
        estimated_volume_m3: estimation.estimatedVolumeM3,
        estimated_weight_kg: estimation.estimatedWeightKg,
        confidence: estimation.confidence,
        details: estimation.details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging capacity estimation:', error);
  }
}

/* To deploy this function:
1. Make sure you have the Supabase CLI installed
2. Run: supabase functions deploy ai-capacity-estimation
3. Set up the required environment variables in your Supabase project
4. Create the capacity_estimation_logs table if needed for analytics
*/
