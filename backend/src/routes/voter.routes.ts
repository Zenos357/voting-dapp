import { Router } from 'express';
import { VoterController } from '../controllers/voter.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate);

const officerOrAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER];

router.get('/election/:electionId', authorize(...officerOrAdmin), VoterController.getVoters);
router.post('/election/:electionId', authorize(...officerOrAdmin), VoterController.registerVoter);
router.post('/election/:electionId/import', authorize(...officerOrAdmin), VoterController.importVoters);
router.get('/election/:electionId/eligibility/:userId?', VoterController.checkEligibility);

export default router;
