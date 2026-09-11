import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { AuditService } from './audit.service.js';
import { AUDIT_ACTIONS } from '../constants/index.js';
import type { PaginationQuery, PaginatedResult } from '../types/index.js';

export class UserService {
  public static async getUsers(query: PaginationQuery & { role?: string; isActive?: boolean }): Promise<PaginatedResult<IUser>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { username: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { fullName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.role) {
      filter.roles = query.role;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy || 'createdAt';

    const [items, total] = await Promise.all([
      User.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  public static async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  public static async createUser(data: any, adminId: string): Promise<IUser> {
    const existing = await User.findOne({
      $or: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }],
    });
    if (existing) {
      throw new ConflictError('User with this email or username already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, config.security.bcryptRounds);
    const user = await User.create({
      ...data,
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      passwordHash,
      isActive: true,
      isVerified: true,
    });

    await AuditService.log({
      userId: adminId,
      action: AUDIT_ACTIONS.USER_CREATED,
      entityType: 'User',
      entityId: user._id.toString(),
      newValue: { username: user.username, email: user.email, roles: user.roles },
    });

    return user;
  }

  public static async updateUser(id: string, data: any, adminId: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found');

    const oldVal = { fullName: user.fullName, roles: user.roles, mobileNumber: user.mobileNumber };
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.mobileNumber !== undefined) user.mobileNumber = data.mobileNumber;
    if (data.roles !== undefined) user.roles = data.roles;

    await user.save();

    await AuditService.log({
      userId: adminId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'User',
      entityId: user._id.toString(),
      oldValue: oldVal,
      newValue: { fullName: user.fullName, roles: user.roles, mobileNumber: user.mobileNumber },
    });

    return user;
  }

  public static async updateUserStatus(id: string, isActive: boolean, adminId: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found');

    user.isActive = isActive;
    await user.save();

    await AuditService.log({
      userId: adminId,
      action: isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
      entityType: 'User',
      entityId: user._id.toString(),
      newValue: { isActive },
    });

    return user;
  }
}
