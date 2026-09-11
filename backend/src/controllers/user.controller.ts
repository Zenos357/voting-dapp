import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { sendSuccess, sendPaginated, sendCreated } from '../utils/response.js';

export class UserController {
  public static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getUsers(req.query as any);
      sendPaginated(res, result.items, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  public static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(String(req.params.id));
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  public static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body, req.user!.userId);
      sendCreated(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUser(String(req.params.id), req.body, req.user!.userId);
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUserStatus(String(req.params.id), req.body.isActive, req.user!.userId);
      sendSuccess(res, user, `User ${req.body.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }
}
