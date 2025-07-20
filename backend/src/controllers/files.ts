import { Response } from 'express';
import { prisma } from '../services/database.js';
import { storageService } from '../services/storage.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { AppError } from '../middleware/error.js';

export async function downloadFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      throw new AppError('File not found', 404);
    }

    const { data, error } = await storageService.downloadFile(file.storagePath);

    if (error || !data) {
      throw new AppError('Failed to download file', 500);
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.send(buffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error instanceof AppError ? error : new AppError('Failed to download file', 500);
  }
}