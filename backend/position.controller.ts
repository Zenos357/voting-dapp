import { Request, Response, NextFunction } from 'express';
import { PositionService } from '../services/position.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

export class PositionController {
  public static async getPositions(req: Request, res: Response, next: NextFunction) {
    try {
      const positions = await PositionService.getPositionsByElection(String(req.params.electionId));
      sendSuccess(res, positions);
    } catch (error) {
      next(error);
    }
  }

  public static async createPosition(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await PositionService.createPosition(
        String(req.params.electionId),
        req.body,
        req.user!.userId
      );
      sendCreated(res, position, 'Position added to election');
    } catch (error) {
      next(error);
    }
  }

  public static async updatePosition(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await PositionService.updatePosition(
        String(req.params.id),
        req.body,
        req.user!.userId
      );
      sendSuccess(res, position, 'Position updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async deletePosition(req: Request, res: Response, next: NextFunction) {
    try {
      await PositionService.deletePosition(String(req.params.id), req.user!.userId);
      sendSuccess(res, null, 'Position deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
