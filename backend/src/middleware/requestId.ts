import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * A simple middleware that will add a unique id to the request object
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  return next();
};
