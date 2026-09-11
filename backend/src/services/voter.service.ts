import { ElectionVoter, IElectionVoter } from '../models/ElectionVoter.js';
import { Election } from '../models/Election.js';
import { User } from '../models/User.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';
import { AUDIT_ACTIONS, ROLES } from '../constants/index.js';
import type { PaginationQuery, PaginatedResult } from '../types/index.js';

export class VoterService {
  public static async getVotersByElection(
    electionId: string,
    query: PaginationQuery & { hasVoted?: boolean; isEligible?: boolean }
  ): Promise<PaginatedResult<IElectionVoter>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = { electionId };
    if (query.hasVoted !== undefined) filter.hasVoted = query.hasVoted;
    if (query.isEligible !== undefined) filter.isEligible = query.isEligible;
    if (query.search) {
      filter.voterNumber = { $regex: query.search, $options: 'i' };
    }

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy || 'createdAt';

    const [items, total] = await Promise.all([
      ElectionVoter.find(filter)
        .populate('userId', 'fullName email username mobileNumber')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      ElectionVoter.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  public static async registerVoterToElection(
    electionId: string,
    userId: string,
    voterNumber: string,
    adminId: string
  ): Promise<IElectionVoter> {
    const [election, user] = await Promise.all([
      Election.findById(electionId),
      User.findById(userId),
    ]);

    if (!election) throw new NotFoundError('Election not found');
    if (!user) throw new NotFoundError('User not found');

    const existing = await ElectionVoter.findOne({ electionId, userId });
    if (existing) {
      throw new ConflictError('User is already registered for this election');
    }

    const voter = await ElectionVoter.create({
      electionId,
      userId,
      voterNumber: voterNumber || `VTR-${Date.now().toString().slice(-6)}`,
      isEligible: true,
      eligibilityStatus: 'ELIGIBLE',
      hasVoted: false,
    });

    await AuditService.log({
      userId: adminId,
      action: AUDIT_ACTIONS.VOTER_ADDED,
      entityType: 'ElectionVoter',
      entityId: voter._id.toString(),
      newValue: { electionId, userId, voterNumber: voter.voterNumber },
    });

    return voter;
  }

  public static async importVotersFromList(
    electionId: string,
    voterRecords: Array<{ email?: string; username?: string; voterNumber?: string; fullName?: string }>,
    adminId: string
  ) {
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < voterRecords.length; i++) {
      const rec = voterRecords[i];
      try {
        let user = null;
        if (rec.email) {
          user = await User.findOne({ email: rec.email.toLowerCase() });
        } else if (rec.username) {
          user = await User.findOne({ username: rec.username.toLowerCase() });
        }

        if (!user) {
          errors.push(`Row ${i + 1}: User not found with given identifier`);
          skipped++;
          continue;
        }

        const existing = await ElectionVoter.findOne({ electionId, userId: user._id });
        if (existing) {
          skipped++;
          continue;
        }

        const voterNumber = rec.voterNumber || `VTR-${(imported + 1).toString().padStart(4, '0')}`;
        await ElectionVoter.create({
          electionId,
          userId: user._id,
          voterNumber,
          isEligible: true,
          eligibilityStatus: 'ELIGIBLE',
          hasVoted: false,
        });

        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
        skipped++;
      }
    }

    await AuditService.log({
      userId: adminId,
      action: AUDIT_ACTIONS.VOTER_IMPORTED,
      entityType: 'ElectionVoter',
      newValue: { electionId, imported, skipped, total: voterRecords.length },
    });

    return {
      total: voterRecords.length,
      imported,
      skipped,
      errors,
    };
  }

  public static async checkEligibility(electionId: string, userId: string) {
    const voter = await ElectionVoter.findOne({ electionId, userId });
    if (!voter) {
      return {
        isRegistered: false,
        isEligible: false,
        hasVoted: false,
        status: 'NOT_REGISTERED',
      };
    }

    return {
      isRegistered: true,
      isEligible: voter.isEligible,
      hasVoted: voter.hasVoted,
      voterNumber: voter.voterNumber,
      status: voter.eligibilityStatus,
      votedAt: voter.votedAt,
    };
  }
}
