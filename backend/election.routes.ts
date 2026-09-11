import { Router } from 'express';
import { ElectionController } from '../controllers/election.controller.js';
import { PositionController } from '../controllers/position.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/index.js';
import {
  createElectionSchema,
  updateElectionSchema,
  createPositionSchema,
  updatePositionSchema,
} from '../validators/election.validator.js';

const router = Router();

// Public routes
router.get('/public/:identifier', ElectionController.getPublicElection);

// Protected routes
router.use(authenticate);

router.get('/', ElectionController.getElections);
router.get('/:id', ElectionController.getElectionById);

const officerOrAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER];

router.post('/', authorize(...officerOrAdmin), validate(createElectionSchema), ElectionController.createElection);
router.put('/:id', authorize(...officerOrAdmin), validate(updateElectionSchema), ElectionController.updateElection);

// Lifecycle transitions
router.post('/:id/open-nominations', authorize(...officerOrAdmin), ElectionController.openNominations);
router.post('/:id/close-nominations', authorize(...officerOrAdmin), ElectionController.closeNominations);
router.post('/:id/prepare-voting', authorize(...officerOrAdmin), ElectionController.prepareVoting);
router.post('/:id/start-voting', authorize(...officerOrAdmin), ElectionController.startVoting);
router.post('/:id/close-voting', authorize(...officerOrAdmin), ElectionController.closeVoting);
router.post('/:id/publish-results', authorize(...officerOrAdmin), ElectionController.publishResults);
router.post('/:id/cancel', authorize(...officerOrAdmin), ElectionController.cancelElection);

// Positions routes nested under elections
router.get('/:electionId/positions', PositionController.getPositions);
router.post('/:electionId/positions', authorize(...officerOrAdmin), validate(createPositionSchema), PositionController.createPosition);
router.put('/positions/:id', authorize(...officerOrAdmin), validate(updatePositionSchema), PositionController.updatePosition);
router.delete('/positions/:id', authorize(...officerOrAdmin), PositionController.deletePosition);

export default router;
