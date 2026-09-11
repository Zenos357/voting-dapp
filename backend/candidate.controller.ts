import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/candidate.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';

export class CandidateController {
  public static async getCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CandidateService.getCandidates(String(req.params.electionId), req.query as any);
      sendPaginated(res, result.items, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  public static async getCandidateById(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.getCandidateById(String(req.params.id));
      sendSuccess(res, candidate);
    } catch (error) {
      next(error);
    }
  }

  public static async submitNomination(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.submitNomination(
        String(req.params.electionId),
        req.body,
        req.user!.userId
      );
      sendCreated(res, candidate, 'Nomination submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async approveCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.approveCandidate(String(req.params.id), req.user!.userId);
      sendSuccess(res, candidate, 'Candidate approved');
    } catch (error) {
      next(error);
    }
  }

  public static async rejectCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.rejectCandidate(
        String(req.params.id),
        req.body.rejectedReason,
        req.user!.userId
      );
      sendSuccess(res, candidate, 'Candidate nomination rejected');
    } catch (error) {
      next(error);
    }
  }

  public static async withdrawNomination(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.withdrawNomination(String(req.params.id), req.user!.userId);
      sendSuccess(res, candidate, 'Nomination withdrawn');
    } catch (error) {
      next(error);
    }
  }

  public static async disqualifyCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.disqualifyCandidate(String(req.params.id), req.user!.userId);
      sendSuccess(res, candidate, 'Candidate disqualified');
    } catch (error) {
      next(error);
    }
  }
}
