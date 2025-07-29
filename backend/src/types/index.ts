import { Request } from 'express';
import { ActivityType } from '@prisma/client';
import { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: Logger;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export interface ProcessRequestBody {
  text: string;
  instruction?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TranscribeRequestBody {
  language?: string;
  model?: string;
  enhance?: boolean;
}

export interface ProcessResponse {
  activityId: string;
  outputText: string;
  inputText: string;
  type: ActivityType;
  fileId?: string;
}

export interface ActivityListResponse {
  activities: Array<{
    id: string;
    userId: string;
    type: ActivityType;
    fileId: string | null;
    inputText: string;
    outputText: string;
    providerResponse: ProviderResponse;
    createdAt: Date;
  }>;
  total: number;
  offset: number;
  limit: number;
}

export interface ProviderResponse {
  deepgram?: {
    transcript: string;
    duration?: number; // Duration in seconds
    confidence?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  };
  openai?: {
    totalTokens: number | null | undefined;
  };
}
