import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('8000').transform(Number),
  SERVER_HOST: z.string().default('0.0.0.0'),

  // API Keys
  DEEPGRAM_API_KEY: z.string(),
  AZURE_OPENAI_ENDPOINT_URL: z.string().url(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().default('gpt-4o-mini'),
  AZURE_OPENAI_API_KEY: z.string(),

  // Supabase Configuration
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  
  // Database Configuration
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string().optional(),

  // Optional configurations with defaults
  CORS_ORIGINS: z.string().default('tauri://localhost').transform((val) => val.split(',')),
  OPENAI_API_VERSION: z.string().default('2025-01-01-preview'),
  OPENAI_TEMPERATURE: z.string().default('0.7').transform(Number),
  OPENAI_MAX_TOKENS: z.string().default('2000').transform(Number),
  OPENAI_ENHANCEMENT_TEMPERATURE: z.string().default('0.3').transform(Number),
  OPENAI_ENHANCEMENT_MAX_TOKENS: z.string().default('500').transform(Number),
  DEEPGRAM_MODEL: z.string().default('nova-2'),
  DEEPGRAM_LANGUAGE: z.string().default('en-US'),
  DEEPGRAM_UTTERANCE_END_MS: z.string().default('1000').transform(Number),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('Invalid environment variables:', envResult.error.format());
  process.exit(1);
}

export const env = envResult.data;

export type Env = typeof env;