import { Router } from 'express';
import { ResultController } from '../controllers/result.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Authenticated results route
router.get('/:electionId', authenticate, ResultController.getElectionResults);
router.get('/:electionId/export', authenticate, ResultController.exportResultsCSV);

export default router;
