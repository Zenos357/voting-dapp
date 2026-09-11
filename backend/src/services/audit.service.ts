import { AuditLog } from '../models/AuditLog.js';
import type { AuditAction } from '../constants/index.js';

export interface CreateAuditLogParams {
  userId?: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await AuditLog.create({
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        traceId: params.traceId,
        metadata: params.metadata,
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}
