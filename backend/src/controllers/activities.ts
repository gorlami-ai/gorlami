import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ActivityType } from '@prisma/client';
import { prisma } from '../services/database.js';
import { openaiService } from '../services/openai.js';
import { deepgramService } from '../services/deepgram.js';
import { storageService } from '../services/storage.js';
import type { AuthenticatedRequest, ProcessRequestBody, ProcessResponse } from '../types/index.js';
import { AppError } from '../middleware/error.js';
import { listActivitiesQuerySchema } from '../utils/validation.js';
import logger from '../utils/logger.js';

export async function processText(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { text, instruction, temperature, maxTokens } = req.body as ProcessRequestBody;
    const userId = req.userId;

    const { content: outputText, totalTokens } = await openaiService.processText(
      text,
      instruction,
      temperature,
      maxTokens
    );

    const activity = await prisma.activity.create({
      data: {
        id: uuidv4(),
        userId,
        type: ActivityType.AI_PROCESSING,
        inputText: text,
        outputText,
        providerResponse: {
          openai: {
            totalTokens,
            model: 'gpt-4o-mini',
          },
        },
      },
    });

    const response: ProcessResponse = {
      activityId: activity.id,
      outputText: activity.outputText,
      inputText: activity.inputText,
      type: activity.type,
    };

    res.json(response);
  } catch (error) {
    logger.error(error, 'Error processing text');
    throw new AppError('Failed to process text', 500);
  }
}

export async function transcribeAudio(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('No audio file provided', 400);
    }

    const { language, model, enhance } = req.body;
    const userId = req.userId;
    const fileId = uuidv4();
    
    // Check if it's raw PCM audio
    let mimetype = file.mimetype;
    if (mimetype === 'audio/pcm' && req.headers['x-sample-rate']) {
      // For raw PCM, we need to specify the encoding parameters
      const sampleRate = req.headers['x-sample-rate'];
      mimetype = `audio/raw;encoding=signed-integer;bits=16;rate=${sampleRate};endian=little`;
    }

    const storagePath = `${userId}/${fileId}/${file.originalname}`;
    const { error: uploadError } = await storageService.uploadFile(
      storagePath,
      file.buffer,
      mimetype
    );

    if (uploadError) {
      throw new AppError('Failed to upload file', 500);
    }

    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        userId,
        filename: file.originalname,
        storagePath,
        sizeBytes: file.size,
      },
    });

    const transcript = await deepgramService.transcribeAudio(
      file.buffer,
      mimetype,
      language,
      model
    );

    let outputText = transcript;
    const providerResponse: any = {
      deepgram: { transcript },
    };

    if (enhance && transcript) {
      const { content: enhancedText, totalTokens } = await openaiService.enhanceTranscription(
        transcript
      );
      outputText = enhancedText;
      providerResponse.openai = { totalTokens };
    }

    const activity = await prisma.activity.create({
      data: {
        id: uuidv4(),
        userId,
        type: ActivityType.TRANSCRIPTION,
        fileId: fileRecord.id,
        inputText: transcript,
        outputText,
        providerResponse,
      },
    });

    // Return transcription-specific response format
    const response = {
      activityId: activity.id,
      transcription: activity.outputText,
      enhanced: enhance && outputText !== transcript ? outputText : undefined,
    };

    res.json(response);
  } catch (error) {
    logger.error(error, 'Error transcribing audio');
    throw error instanceof AppError ? error : new AppError('Failed to transcribe audio', 500);
  }
}

export async function listActivities(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.userId;
    const query = listActivitiesQuerySchema.parse(req.query);

    const where = {
      userId,
      ...(query.type && { type: query.type }),
    };

    const [activities, total] = await prisma.$transaction([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      activities,
      total,
      offset: query.offset,
      limit: query.limit,
    });
  } catch (error) {
    logger.error(error, 'Error listing activities');
    throw new AppError('Failed to list activities', 500);
  }
}

export async function getActivity(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { activityId } = req.params;
    const userId = req.userId;

    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        userId,
      },
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    const response: ProcessResponse = {
      activityId: activity.id,
      outputText: activity.outputText,
      inputText: activity.inputText,
      type: activity.type,
      fileId: activity.fileId || undefined,
    };

    res.json(response);
  } catch (error) {
    logger.error(error, 'Error getting activity');
    throw error instanceof AppError ? error : new AppError('Failed to get activity', 500);
  }
}