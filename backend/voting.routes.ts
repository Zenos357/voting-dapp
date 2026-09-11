import { Router } from 'express';
import { VotingController } from '../controllers/voting.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { voteLimiter } from '../middleware/rateLimiter.js';
import { ROLES } from '../constants/index.js';
import { castVoteSchema } from '../validators/voting.validator.js';

const router = Router();

router.use(authenticate);

// Voters, candidates and officers can access voter endpoints
const voterRoles = [ROLES.VOTER, ROLES.CANDIDATE, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER];

router.get('/available-elections', authorize(...voterRoles), VotingController.getAvailableElections);
router.get('/:electionId/ballot', authorize(...voterRoles), VotingController.getBallot);
router.get('/:electionId/status', authorize(...voterRoles), VotingController.getVotingStatus);
router.post(
  '/:electionId/cast',
  authorize(...voterRoles),
  voteLimiter,
  validate(castVoteSchema),
  VotingController.castVote
);

export default router;
