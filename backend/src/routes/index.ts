import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { processRequestSchema, transcribeRequestSchema } from '../utils/validation.js';
import * as activitiesController from '../controllers/activities.js';
import * as filesController from '../controllers/files.js';
import * as healthController from '../controllers/health.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Health check
router.get('/', healthController.healthCheck);

// Protected routes
router.use('/api', authenticate as any);

// Activities routes
router.post(
  '/api/process',
  validate(processRequestSchema),
  activitiesController.processText as any
);

router.post(
  '/api/transcribe',
  upload.single('audio_file'),
  validate(transcribeRequestSchema),
  activitiesController.transcribeAudio as any
);

router.get('/api/activities', activitiesController.listActivities as any);
router.get('/api/activities/:activityId', activitiesController.getActivity as any);

// Files routes
router.get('/api/files/:fileId', filesController.downloadFile as any);

export default router;