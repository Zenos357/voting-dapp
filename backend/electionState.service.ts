import { Election, IElection } from '../models/Election.js';
import { ELECTION_STATUS, type ElectionStatusType, isValidTransition, AUDIT_ACTIONS } from '../constants/index.js';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';

export class ElectionStateService {
  public static async transition(
    electionId: string,
    targetStatus: ElectionStatusType,
    userId: string
  ): Promise<IElection> {
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    const currentStatus = election.status as ElectionStatusType;

    if (currentStatus === targetStatus) {
      return election; // Idempotent
    }

    if (!isValidTransition(currentStatus, targetStatus)) {
      throw new ConflictError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`
      );
    }

    // Business validation checks for transitions
    if (targetStatus === ELECTION_STATUS.VOTING_LIVE) {
      const now = new Date();
      if (now < election.votingStartAt) {
        throw new BadRequestError('Cannot start voting before scheduled voting start time');
      }
    }

    election.status = targetStatus;
    election.updatedBy = userId as any;
    await election.save();

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.ELECTION_STATUS_CHANGED,
      entityType: 'Election',
      entityId: election._id.toString(),
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus },
    });

    return election;
  }
}
