import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class DashboardController {
  public static async getAdminDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getAdminDashboard();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  public static async getOfficerDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getOfficerDashboard(req.user!.userId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export class AuditController {
  public static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.action) filter.action = req.query.action;
      if (req.query.entityType) filter.entityType = req.query.entityType;
      if (req.query.entityId) filter.entityId = req.query.entityId;

      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .populate('userId', 'username fullName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(filter),
      ]);

      sendPaginated(res, items, page, limit, total);
    } catch (error) {
      next(error);
    }
  }
}

export class NotificationController {
  public static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await Notification.find({ userId: req.user!.userId })
        .sort({ createdAt: -1 })
        .limit(30);
      sendSuccess(res, notifications);
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await Notification.updateOne(
        { _id: req.params.id, userId: req.user!.userId },
        { isRead: true, readAt: new Date() }
      );
      sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }
}
