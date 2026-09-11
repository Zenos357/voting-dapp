import { Request, Response, NextFunction } from 'express';
import { VoterService } from '../services/voter.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';

export class VoterController {
  public static async getVoters(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VoterService.getVotersByElection(String(req.params.electionId), req.query as any);
      sendPaginated(res, result.items, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  public static async registerVoter(req: Request, res: Response, next: NextFunction) {
    try {
      const voter = await VoterService.registerVoterToElection(
        String(req.params.electionId),
        req.body.userId,
        req.body.voterNumber,
        req.user!.userId
      );
      sendCreated(res, voter, 'Voter registered to election');
    } catch (error) {
      next(error);
    }
  }

  public static async importVoters(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VoterService.importVotersFromList(
        String(req.params.electionId),
        req.body.voters,
        req.user!.userId
      );
      sendSuccess(res, result, 'Voter import completed');
    } catch (error) {
      next(error);
    }
  }

  public static async checkEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.userId ? String(req.params.userId) : req.user!.userId;
      const result = await VoterService.checkEligibility(String(req.params.electionId), targetUserId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
