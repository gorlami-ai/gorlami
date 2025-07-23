import { Request, Response } from 'express';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.json({
    status: 'healthy',
    service: 'gorlami-backend',
    timestamp: new Date().toISOString(),
  });
}