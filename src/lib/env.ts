/**
 * Environment Variable Validation
 * Validates required environment variables at application startup
 */

import { z } from 'zod';

const envSchema = z.object({
  // Supabase Configuration (Required)
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1, 'VITE_SUPABASE_PROJECT_ID is required'),

  // Geoapify API Key (Optional - for geocoding and routing)
  VITE_GEOAPIFY_API_KEY: z.string().optional(),

  // Environment mode
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
  MODE: z.enum(['development', 'production', 'test']).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Call this at application startup to catch configuration errors early
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => {
        return `  • ${err.path.join('.')}: ${err.message}`;
      }).join('\n');

      console.error(
        '❌ Environment variable validation failed:\n\n' +
        missingVars +
        '\n\n' +
        'Please check your .env file and ensure all required variables are set.\n' +
        'See .env.example for reference.'
      );

      // In development, show a helpful error
      if (import.meta.env.DEV) {
        throw new Error(
          'Missing required environment variables. Check the console for details.'
        );
      }
    }

    throw error;
  }
}

/**
 * Get validated environment variables
 * Safe to use after calling validateEnv()
 */
export const env = import.meta.env as unknown as Env;
