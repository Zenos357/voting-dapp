import { Candidate, ICandidate } from '../models/Candidate.js';
import { Election } from '../models/Election.js';
import { ElectionPosition } from '../models/ElectionPosition.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';
import { CANDIDATE_STATUS, AUDIT_ACTIONS, ELECTION_STATUS } from '../constants/index.js';
import type { PaginationQuery, PaginatedResult } from '../types/index.js';

export class CandidateService {
  public static async getCandidates(
    electionId: string,
    query: PaginationQuery & { status?: string; positionId?: string }
  ): Promise<PaginatedResult<ICandidate>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = { electionId };
    if (query.status) filter.status = query.status;
    if (query.positionId) filter.positionId = query.positionId;
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { candidateCode: { $regex: query.search, $options: 'i' } },
        { symbol: { $regex: query.search, $options: 'i' } },
      ];
    }

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy || 'createdAt';

    const [items, total] = await Promise.all([
      Candidate.find(filter)
        .populate('positionId', 'name maxVotesAllowed')
        .populate('userId', 'fullName username email profilePhoto')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Candidate.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  public static async getCandidateById(id: string): Promise<ICandidate> {
    const candidate = await Candidate.findById(id)
      .populate('positionId', 'name maxVotesAllowed')
      .populate('electionId', 'name electionCode status votingStartAt votingEndAt')
      .populate('userId', 'fullName username email profilePhoto');

    if (!candidate) throw new NotFoundError('Candidate not found');
    return candidate;
  }

  public static async submitNomination(
    electionId: string,
    data: any,
    userId: string
  ): Promise<ICandidate> {
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    if (election.status !== ELECTION_STATUS.NOMINATION_OPEN && election.status !== ELECTION_STATUS.DRAFT) {
      throw new BadRequestError('Nominations are not currently open for this election');
    }

    const position = await ElectionPosition.findOne({ _id: data.positionId, electionId });
    if (!position) throw new NotFoundError('Position does not belong to this election');

    const existingNomination = await Candidate.findOne({
      electionId,
      userId,
      positionId: data.positionId,
    });
    if (existingNomination) {
      throw new ConflictError('You have already submitted a nomination for this position');
    }

    const candidate = await Candidate.create({
      ...data,
      userId,
      electionId,
      status: CANDIDATE_STATUS.SUBMITTED,
      submittedAt: new Date(),
    });

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.CANDIDATE_SUBMITTED,
      entityType: 'Candidate',
      entityId: candidate._id.toString(),
      newValue: { fullName: candidate.fullName, positionId: candidate.positionId },
    });

    return candidate;
  }

  public static async approveCandidate(id: string, reviewerId: string): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw new NotFoundError('Candidate not found');

    candidate.status = CANDIDATE_STATUS.APPROVED;
    candidate.approvedAt = new Date();
    candidate.approvedBy = reviewerId as any;
    candidate.rejectedReason = undefined;
    await candidate.save();

    await AuditService.log({
      userId: reviewerId,
      action: AUDIT_ACTIONS.CANDIDATE_APPROVED,
      entityType: 'Candidate',
      entityId: candidate._id.toString(),
    });

    return candidate;
  }

  public static async rejectCandidate(id: string, reason: string, reviewerId: string): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw new NotFoundError('Candidate not found');

    candidate.status = CANDIDATE_STATUS.REJECTED;
    candidate.rejectedReason = reason;
    await candidate.save();

    await AuditService.log({
      userId: reviewerId,
      action: AUDIT_ACTIONS.CANDIDATE_REJECTED,
      entityType: 'Candidate',
      entityId: candidate._id.toString(),
      newValue: { rejectedReason: reason },
    });

    return candidate;
  }

  public static async withdrawNomination(id: string, userId: string): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw new NotFoundError('Candidate not found');

    if (candidate.userId.toString() !== userId) {
      throw new BadRequestError('You can only withdraw your own nomination');
    }

    candidate.status = CANDIDATE_STATUS.WITHDRAWN;
    await candidate.save();

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.CANDIDATE_WITHDRAWN,
      entityType: 'Candidate',
      entityId: candidate._id.toString(),
    });

    return candidate;
  }

  public static async disqualifyCandidate(id: string, reviewerId: string): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw new NotFoundError('Candidate not found');

    candidate.status = CANDIDATE_STATUS.DISQUALIFIED;
    await candidate.save();

    await AuditService.log({
      userId: reviewerId,
      action: AUDIT_ACTIONS.CANDIDATE_DISQUALIFIED,
      entityType: 'Candidate',
      entityId: candidate._id.toString(),
    });

    return candidate;
  }
}
