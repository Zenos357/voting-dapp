import { Request, Response, NextFunction } from 'express';
import { VotingService } from '../services/voting.service.js';
import { sendSuccess } from '../utils/response.js';

export class VotingController {
  public static async getAvailableElections(req: Request, res: Response, next: NextFunction) {
    try {
      const elections = await VotingService.getAvailableElectionsForVoter(req.user!.userId);
      sendSuccess(res, elections);
    } catch (error) {
      next(error);
    }
  }

  public static async getBallot(req: Request, res: Response, next: NextFunction) {
    try {
      const ballot = await VotingService.getBallot(String(req.params.electionId), req.user!.userId);
      sendSuccess(res, ballot);
    } catch (error) {
      next(error);
    }
  }

  public static async castVote(req: Request, res: Response, next: NextFunction) {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

      const result = await VotingService.castVote({
        electionId: String(req.params.electionId),
        userId: req.user!.userId,
        votes: req.body.votes,
        idempotencyKey,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        traceId: req.traceId,
      });

      sendSuccess(res, result, 'Vote recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getVotingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await VotingService.getVotingStatus(String(req.params.electionId), req.user!.userId);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }
}
