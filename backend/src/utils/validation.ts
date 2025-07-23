import { z } from 'zod';

export const processRequestSchema = z.object({
  text: z.string().min(1),
  instruction: z.string().optional().default('Improve clarity and formatting'),
  temperature: z.number().min(0).max(1).optional().default(0.7),
  maxTokens: z.number().min(1).max(8192).optional().default(4096),
});

export const transcribeRequestSchema = z.object({
  language: z.string().optional().default('en-US'),
  model: z.string().optional().default('nova-2'),
  enhance: z.union([
    z.boolean(),
    z.string().transform(val => val === 'true')
  ]).optional().default(true),
});

export const listActivitiesQuerySchema = z.object({
  limit: z.string().optional().default('50').transform(Number).pipe(z.number().min(1).max(100)),
  offset: z.string().optional().default('0').transform(Number).pipe(z.number().min(0)),
  type: z.enum(['TRANSCRIPTION', 'AI_PROCESSING']).optional(),
});