import { Election, IElection } from '../models/Election.js';
import { ElectionPosition, IElectionPosition } from '../models/ElectionPosition.js';
import { Candidate } from '../models/Candidate.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';
import { AUDIT_ACTIONS, ELECTION_STATUS } from '../constants/index.js';
import type { PaginationQuery, PaginatedResult } from '../types/index.js';

export class ElectionService {
  public static async getElections(
    query: PaginationQuery & { status?: string; type?: string; isActive?: boolean }
  ): Promise<PaginatedResult<IElection>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { electionCode: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy || 'createdAt';

    const [items, total] = await Promise.all([
      Election.find(filter).populate('createdBy', 'fullName email').sort({ [sortBy]: sortOrder }).skip(skip).limit(limit),
      Election.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  public static async getElectionById(id: string): Promise<any> {
    const election = await Election.findById(id).populate('createdBy', 'fullName email username');
    if (!election) throw new NotFoundError('Election not found');

    const positions = await ElectionPosition.find({ electionId: election._id, isActive: true }).sort({ displayOrder: 1 });
    const candidates = await Candidate.find({ electionId: election._id }).populate('userId', 'fullName profilePhoto');

    return {
      election,
      positions,
      candidates,
    };
  }

  public static async getPublicElectionByCodeOrId(identifier: string): Promise<any> {
    const election = await Election.findOne({
      $or: [{ publicId: identifier }, { electionCode: identifier.toUpperCase() }],
      isActive: true,
    });
    if (!election) throw new NotFoundError('Election not found');

    const positions = await ElectionPosition.find({ electionId: election._id, isActive: true }).sort({ displayOrder: 1 });
    const candidates = await Candidate.find({
      electionId: election._id,
      status: 'APPROVED',
    }).select('fullName symbol manifesto profilePhotoUrl positionId candidateCode');

    return {
      election,
      positions,
      candidates,
    };
  }

  public static async createElection(data: any, userId: string): Promise<IElection> {
    const existing = await Election.findOne({ electionCode: data.electionCode.toUpperCase() });
    if (existing) throw new ConflictError('Election with this code already exists');

    const election = await Election.create({
      ...data,
      electionCode: data.electionCode.toUpperCase(),
      createdBy: userId,
      status: ELECTION_STATUS.DRAFT,
    });

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.ELECTION_CREATED,
      entityType: 'Election',
      entityId: election._id.toString(),
      newValue: { name: election.name, code: election.electionCode },
    });

    return election;
  }

  public static async updateElection(id: string, data: any, userId: string): Promise<IElection> {
    const election = await Election.findById(id);
    if (!election) throw new NotFoundError('Election not found');

    if (election.status === ELECTION_STATUS.VOTING_LIVE || election.status === ELECTION_STATUS.VOTING_CLOSED) {
      throw new BadRequestError('Cannot modify election details while voting is active or closed');
    }

    Object.assign(election, data);
    election.updatedBy = userId as any;
    await election.save();

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.ELECTION_UPDATED,
      entityType: 'Election',
      entityId: election._id.toString(),
    });

    return election;
  }
}
