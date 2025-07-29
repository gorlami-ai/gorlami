import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { processRequestSchema, transcribeRequestSchema } from '../utils/validation.js';
import { asyncHandler } from '../utils/async-handler.js';
import * as activitiesController from '../controllers/activities.js';
import * as filesController from '../controllers/files.js';
import * as healthController from '../controllers/health.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Health check
router.get('/', healthController.healthCheck);

// Protected routes - wrap authenticate to handle type mismatch
router.use('/api', (req, res, next) => authenticate(req as any, res, next));

// Activities routes
router.post(
  '/api/process',
  validate(processRequestSchema),
  asyncHandler(activitiesController.processText)
);

router.post(
  '/api/transcribe',
  upload.single('audio'),
  validate(transcribeRequestSchema),
  asyncHandler(activitiesController.transcribeAudio)
);

router.get('/api/activities', asyncHandler(activitiesController.listActivities));
router.get('/api/activities/:activityId', asyncHandler(activitiesController.getActivity));
router.post(
  '/api/activities/:activityId/audio',
  upload.single('audio'),
  asyncHandler(activitiesController.uploadActivityAudio)
);
router.delete('/api/activities/:activityId', asyncHandler(activitiesController.deleteActivity));

// Files routes
router.get('/api/files/:fileId/signed-url', asyncHandler(filesController.getSignedUrl));

export default router;