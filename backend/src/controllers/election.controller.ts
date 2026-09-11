import { Request, Response, NextFunction } from 'express';
import { ElectionService } from '../services/election.service.js';
import { ElectionStateService } from '../services/electionState.service.js';
import { ELECTION_STATUS } from '../constants/index.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';

export class ElectionController {
  public static async getElections(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ElectionService.getElections(req.query as any);
      sendPaginated(res, result.items, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  public static async getElectionById(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionService.getElectionById(String(req.params.id));
      sendSuccess(res, election);
    } catch (error) {
      next(error);
    }
  }

  public static async getPublicElection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ElectionService.getPublicElectionByCodeOrId(String(req.params.identifier));
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async createElection(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionService.createElection(req.body, req.user!.userId);
      sendCreated(res, election, 'Election created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateElection(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionService.updateElection(String(req.params.id), req.body, req.user!.userId);
      sendSuccess(res, election, 'Election updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Lifecycle state transitions
  public static async openNominations(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.NOMINATION_OPEN, req.user!.userId);
      sendSuccess(res, election, 'Nominations opened successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async closeNominations(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.NOMINATION_CLOSED, req.user!.userId);
      sendSuccess(res, election, 'Nominations closed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async prepareVoting(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.READY_FOR_VOTING, req.user!.userId);
      sendSuccess(res, election, 'Election is ready for voting');
    } catch (error) {
      next(error);
    }
  }

  public static async startVoting(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.VOTING_LIVE, req.user!.userId);
      sendSuccess(res, election, 'Voting has started and is now live');
    } catch (error) {
      next(error);
    }
  }

  public static async closeVoting(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.VOTING_CLOSED, req.user!.userId);
      sendSuccess(res, election, 'Voting closed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async publishResults(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.RESULT_PUBLISHED, req.user!.userId);
      sendSuccess(res, election, 'Results published successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async cancelElection(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await ElectionStateService.transition(String(req.params.id), ELECTION_STATUS.CANCELLED, req.user!.userId);
      sendSuccess(res, election, 'Election cancelled');
    } catch (error) {
      next(error);
    }
  }
}
