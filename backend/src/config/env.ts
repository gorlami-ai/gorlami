import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('8000').transform(Number),
  SERVER_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z
    .string()
    .default('info')
    .transform((val) => val.toLowerCase())
    .pipe(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])),

  // API Keys
  DEEPGRAM_API_KEY: z.string(),
  AZURE_OPENAI_ENDPOINT_URL: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string(),

  // Supabase Configuration
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  SUPABASE_STORAGE_BUCKET: z.string().default('activity-files'),

  // Database Configuration
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string().optional(),

  // CORS Configuration
  CORS_ORIGINS: z
    .string()
    .default('tauri://localhost')
    .transform((val) => val.split(',')),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  // Can't use logger here because it depends on env
  console.error('Invalid environment variables:', envResult.error.format());
  process.exit(1);
}

export const env = envResult.data;

export type Env = typeof env;
