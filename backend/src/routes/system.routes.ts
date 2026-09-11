import { Router } from 'express';
import {
  DashboardController,
  AuditController,
  NotificationController,
} from '../controllers/system.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate);

// Dashboard routes
router.get(
  '/dashboard/admin',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  DashboardController.getAdminDashboard
);
router.get(
  '/dashboard/officer',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER),
  DashboardController.getOfficerDashboard
);

// Audit logs
router.get(
  '/audit-logs',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OBSERVER),
  AuditController.getAuditLogs
);

// Notifications
router.get('/notifications', NotificationController.getMyNotifications);
router.patch('/notifications/:id/read', NotificationController.markAsRead);

export default router;
