import { Response } from 'express';
import { prisma } from '../services/database.js';
import { storageService } from '../services/storage.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../middleware/error.js';
import logger from '../utils/logger.js';

export async function getSignedUrl(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    logger.info({ fileId, userId }, 'Generating signed URL for file');

    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      logger.warn({ fileId, userId }, 'File not found or unauthorized');
      throw new AppError('File not found', 404);
    }

    const expiresIn = 3600; // 1 hour
    const { url, error } = await storageService.createSignedUrl(file.storagePath, expiresIn);

    if (error || !url) {
      logger.error({ error, fileId, storagePath: file.storagePath }, 'Failed to create signed URL');
      throw new AppError('Failed to generate download URL', 500);
    }

    logger.info({ fileId, expiresIn }, 'Signed URL generated successfully');

    res.json({
      url,
      expiresIn,
      filename: file.filename,
      mimeType: 'audio/raw;encoding=signed-integer;bits=16;rate=48000;endian=little', // All our audio files are PCM
      sizeBytes: file.sizeBytes,
    });
  } catch (error) {
    logger.error(error, 'Error generating signed URL');
    throw error instanceof AppError ? error : new AppError('Failed to generate signed URL', 500);
  }
}