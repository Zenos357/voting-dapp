import { Router } from 'express';
import { CandidateController } from '../controllers/candidate.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/index.js';
import {
  createCandidateSchema,
  rejectCandidateSchema,
} from '../validators/candidate.validator.js';

const router = Router();

router.use(authenticate);

const officerOrAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER];

// Public / Authenticated user views
router.get('/election/:electionId', CandidateController.getCandidates);
router.get('/:id', CandidateController.getCandidateById);

// Submit nomination (Candidate or Voter registering as candidate)
router.post(
  '/election/:electionId/nominate',
  authorize(ROLES.CANDIDATE, ROLES.VOTER, ...officerOrAdmin),
  validate(createCandidateSchema),
  CandidateController.submitNomination
);

// Candidate Actions
router.post('/:id/withdraw', CandidateController.withdrawNomination);

// Officer / Admin Review Actions
router.post('/:id/approve', authorize(...officerOrAdmin), CandidateController.approveCandidate);
router.post('/:id/reject', authorize(...officerOrAdmin), validate(rejectCandidateSchema), CandidateController.rejectCandidate);
router.post('/:id/disqualify', authorize(...officerOrAdmin), CandidateController.disqualifyCandidate);

export default router;
