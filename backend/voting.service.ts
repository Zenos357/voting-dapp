import mongoose from 'mongoose';
import { Election } from '../models/Election.js';
import { ElectionPosition } from '../models/ElectionPosition.js';
import { Candidate } from '../models/Candidate.js';
import { ElectionVoter } from '../models/ElectionVoter.js';
import { VoteParticipation } from '../models/VoteParticipation.js';
import { VoteBallot } from '../models/VoteBallot.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { AuditService } from './audit.service.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../utils/errors.js';
import { ELECTION_STATUS, CANDIDATE_STATUS, AUDIT_ACTIONS } from '../constants/index.js';

export interface VoteSelection {
  positionId: string;
  candidateId: string;
}

export interface CastVoteParams {
  electionId: string;
  userId: string;
  votes: VoteSelection[];
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
}

export class VotingService {
  public static async getAvailableElectionsForVoter(userId: string) {
    const voterRegistrations = await ElectionVoter.find({ userId, isEligible: true }).select('electionId hasVoted votedAt');
    const electionIds = voterRegistrations.map((v) => v.electionId);

    const elections = await Election.find({
      _id: { $in: electionIds },
      isActive: true,
    }).sort({ votingStartAt: 1 });

    return elections.map((e) => {
      const reg = voterRegistrations.find((r) => r.electionId.toString() === e._id.toString());
      return {
        election: e,
        hasVoted: reg?.hasVoted ?? false,
        votedAt: reg?.votedAt,
        isVotingLive: e.status === ELECTION_STATUS.VOTING_LIVE,
      };
    });
  }

  public static async getBallot(electionId: string, userId: string) {
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    const voter = await ElectionVoter.findOne({ electionId, userId });
    if (!voter || !voter.isEligible) {
      throw new ForbiddenError('You are not registered or eligible to vote in this election');
    }

    const positions = await ElectionPosition.find({ electionId, isActive: true }).sort({ displayOrder: 1 });
    const positionIds = positions.map((p) => p._id);

    const candidates = await Candidate.find({
      electionId,
      positionId: { $in: positionIds },
      status: CANDIDATE_STATUS.APPROVED,
    }).select('fullName symbol manifesto description profilePhotoUrl positionId candidateCode');

    return {
      election: {
        id: election._id,
        name: election.name,
        code: election.electionCode,
        status: election.status,
        votingStartAt: election.votingStartAt,
        votingEndAt: election.votingEndAt,
      },
      hasVoted: voter.hasVoted,
      positions,
      candidates,
    };
  }

  public static async castVote(params: CastVoteParams) {
    const { electionId, userId, votes, idempotencyKey, ipAddress, userAgent, traceId } = params;

    // 1. Idempotency Check: if identical request submitted previously, return cached response
    if (idempotencyKey) {
      const existingIdempotency = await IdempotencyKey.findOne({ key: idempotencyKey, userId });
      if (existingIdempotency) {
        return existingIdempotency.response;
      }
    }

    // 2. Election Validation
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    if (election.status !== ELECTION_STATUS.VOTING_LIVE) {
      throw new ConflictError(`Voting is not active. Current election status: ${election.status}`);
    }

    const now = new Date();
    if (now < election.votingStartAt || now > election.votingEndAt) {
      throw new ConflictError('Voting is currently outside the scheduled voting window');
    }

    // 3. Voter Eligibility & Duplicate Check
    const voter = await ElectionVoter.findOne({ electionId, userId });
    if (!voter || !voter.isEligible) {
      throw new ForbiddenError('You are not eligible to vote in this election');
    }

    if (voter.hasVoted) {
      await AuditService.log({
        userId,
        action: AUDIT_ACTIONS.DUPLICATE_VOTE_ATTEMPT,
        entityType: 'Election',
        entityId: electionId,
        ipAddress,
        userAgent,
        traceId,
      });
      throw new ConflictError('Your vote has already been recorded for this election. Duplicate voting is prevented.');
    }

    // Double check participation collection
    const existingParticipation = await VoteParticipation.findOne({ electionId, userId });
    if (existingParticipation) {
      throw new ConflictError('Your vote has already been recorded for this election.');
    }

    // 4. Validate Candidate Selections
    for (const vote of votes) {
      const position = await ElectionPosition.findOne({ _id: vote.positionId, electionId, isActive: true });
      if (!position) {
        throw new BadRequestError(`Invalid position ID: ${vote.positionId}`);
      }

      const candidate = await Candidate.findOne({
        _id: vote.candidateId,
        electionId,
        positionId: vote.positionId,
        status: CANDIDATE_STATUS.APPROVED,
      });

      if (!candidate) {
        throw new BadRequestError(`Invalid or unapproved candidate selection`);
      }
    }

    // 5. ATOMIC EXECUTION (Transactions where supported by MongoDB replica set / Session fallback)
    let session: mongoose.ClientSession | null = null;
    let isTransactionActive = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      isTransactionActive = true;
    } catch {
      // Standalone MongoDB instance doesn't support replica set transactions; fallback to sequential with unique index guarantee
      session = null;
      isTransactionActive = false;
    }

    try {
      const opts = session ? { session } : {};

      // A. Create VoteParticipation (Guaranteed unique by compound index { electionId: 1, userId: 1 })
      const participation = new VoteParticipation({
        electionId,
        userId,
        status: 'COMPLETED',
        votedAt: now,
        idempotencyKey,
      });
      await participation.save(opts);

      // B. Create VoteBallot for each position selection (Ballot does NOT store userId for secrecy)
      const ballotReferences: string[] = [];
      for (const vote of votes) {
        const ballot = new VoteBallot({
          electionId,
          positionId: vote.positionId,
          candidateId: vote.candidateId,
          castAt: now,
        });
        await ballot.save(opts);
        ballotReferences.push(ballot.ballotReference);
      }

      // C. Mark ElectionVoter hasVoted flag
      voter.hasVoted = true;
      voter.votedAt = now;
      await voter.save(opts);

      if (isTransactionActive && session) {
        await session.commitTransaction();
      }

      const confirmationResponse = {
        success: true,
        message: 'Your vote has been securely recorded. Thank you for participating in the election.',
        ballotReferences,
        votedAt: now,
        electionName: election.name,
      };

      // D. Save Idempotency Key record
      if (idempotencyKey) {
        try {
          await IdempotencyKey.create({
            key: idempotencyKey,
            userId,
            response: confirmationResponse,
            statusCode: 200,
          });
        } catch {
          // Non-blocking if idempotency key saving fails
        }
      }

      // E. Audit Log (Preserves ballot secrecy: records voter participation WITHOUT candidate choice)
      await AuditService.log({
        userId,
        action: AUDIT_ACTIONS.VOTE_CAST,
        entityType: 'Election',
        entityId: electionId,
        ipAddress,
        userAgent,
        traceId,
      });

      return confirmationResponse;
    } catch (err: any) {
      if (isTransactionActive && session) {
        await session.abortTransaction();
      }

      // If duplicate key error caught from VoteParticipation unique index
      if (err.name === 'MongoServerError' && err.code === 11000) {
        throw new ConflictError('Your vote has already been recorded for this election.');
      }

      throw err;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  public static async getVotingStatus(electionId: string, userId: string) {
    const voter = await ElectionVoter.findOne({ electionId, userId });
    return {
      hasVoted: voter?.hasVoted ?? false,
      votedAt: voter?.votedAt,
    };
  }
}
