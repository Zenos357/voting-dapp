import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { ROLES, type RoleCode, AUDIT_ACTIONS } from '../constants/index.js';
import { AuditService } from './audit.service.js';

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  mobileNumber?: string;
  roles?: string[];
}

export interface LoginDTO {
  identifier: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
}

export class AuthService {
  public static async register(dto: RegisterDTO, context?: { ip?: string; userAgent?: string; traceId?: string }) {
    const existingUser = await User.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.email === dto.email.toLowerCase()) {
        throw new ConflictError('An account with this email already exists');
      }
      throw new ConflictError('This username is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, config.security.bcryptRounds);
    const assignedRoles = dto.roles && dto.roles.length > 0 ? dto.roles : [ROLES.VOTER];

    const user = await User.create({
      username: dto.username.toLowerCase(),
      email: dto.email.toLowerCase(),
      mobileNumber: dto.mobileNumber,
      fullName: dto.fullName,
      passwordHash,
      roles: assignedRoles,
      isActive: true,
      isVerified: true,
    });

    await AuditService.log({
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.USER_CREATED,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      traceId: context?.traceId,
    });

    const accessToken = signAccessToken(user._id.toString(), user.username, user.roles as RoleCode[]);
    const { token: refreshToken, jti } = signRefreshToken(user._id.toString());

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByIp: context?.ip,
    });

    return {
      user: {
        id: user._id,
        publicId: user.publicId,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        profilePhoto: user.profilePhoto,
      },
      accessToken,
      refreshToken,
    };
  }

  public static async login(dto: LoginDTO) {
    const identifier = dto.identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+passwordHash +isActive +failedLoginAttempts +lockedUntil');

    if (!user) {
      await AuditService.log({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Auth',
        metadata: { identifier },
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        traceId: dto.traceId,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact an administrator.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(`Account locked due to consecutive failed attempts. Try again in ${minutesRemaining} minutes.`);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= config.security.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + config.security.lockDurationMinutes * 60000);
      }
      await user.save();

      await AuditService.log({
        userId: user._id.toString(),
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Auth',
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        traceId: dto.traceId,
      });

      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed attempts upon successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = signAccessToken(user._id.toString(), user.username, user.roles as RoleCode[]);
    const { token: refreshToken } = signRefreshToken(user._id.toString());

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByIp: dto.ipAddress,
    });

    await AuditService.log({
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.LOGIN,
      entityType: 'Auth',
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      traceId: dto.traceId,
    });

    return {
      user: {
        id: user._id,
        publicId: user.publicId,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        profilePhoto: user.profilePhoto,
      },
      accessToken,
      refreshToken,
    };
  }

  public static async refreshToken(token: string, ip?: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const existingToken = await RefreshToken.findOne({ tokenHash, userId: payload.sub });

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token revoked or expired');
    }

    // Token rotation: Revoke old token and issue a new pair
    existingToken.revokedAt = new Date();
    existingToken.revokedByIp = ip;
    await existingToken.save();

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User no longer active');
    }

    const newAccessToken = signAccessToken(user._id.toString(), user.username, user.roles as RoleCode[]);
    const { token: newRefreshToken } = signRefreshToken(user._id.toString());
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdByIp: ip,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public static async logout(token: string, ip?: string, userId?: string) {
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date(), revokedByIp: ip });
    }

    if (userId) {
      await AuditService.log({
        userId,
        action: AUDIT_ACTIONS.LOGOUT,
        entityType: 'Auth',
        ipAddress: ip,
      });
    }
  }

  public static async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new BadRequestError('User not found');

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new BadRequestError('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(newPass, config.security.bcryptRounds);
    await user.save();

    // Invalidate all active refresh tokens on password change
    await RefreshToken.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { revokedAt: new Date() });

    await AuditService.log({
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      entityType: 'User',
      entityId: user._id.toString(),
    });
  }

  public static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    return user;
  }
}
