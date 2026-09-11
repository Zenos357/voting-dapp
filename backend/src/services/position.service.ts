import { ElectionPosition, IElectionPosition } from '../models/ElectionPosition.js';
import { Election } from '../models/Election.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';
import { AUDIT_ACTIONS } from '../constants/index.js';

export class PositionService {
  public static async getPositionsByElection(electionId: string): Promise<IElectionPosition[]> {
    return ElectionPosition.find({ electionId, isActive: true }).sort({ displayOrder: 1 });
  }

  public static async createPosition(electionId: string, data: any, userId: string): Promise<IElectionPosition> {
    const election = await Election.findById(electionId);
    if (!election) throw new NotFoundError('Election not found');

    const existing = await ElectionPosition.findOne({ electionId, name: data.name });
    if (existing) throw new ConflictError('A position with this name already exists in this election');

    const position = await ElectionPosition.create({
      ...data,
      electionId,
    });

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.POSITION_CREATED,
      entityType: 'ElectionPosition',
      entityId: position._id.toString(),
      newValue: { name: position.name, electionId },
    });

    return position;
  }

  public static async updatePosition(positionId: string, data: any, userId: string): Promise<IElectionPosition> {
    const position = await ElectionPosition.findById(positionId);
    if (!position) throw new NotFoundError('Position not found');

    Object.assign(position, data);
    await position.save();

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.POSITION_UPDATED,
      entityType: 'ElectionPosition',
      entityId: position._id.toString(),
      newValue: data,
    });

    return position;
  }

  public static async deletePosition(positionId: string, userId: string): Promise<void> {
    const position = await ElectionPosition.findById(positionId);
    if (!position) throw new NotFoundError('Position not found');

    position.isActive = false;
    await position.save();

    await AuditService.log({
      userId,
      action: AUDIT_ACTIONS.POSITION_DELETED,
      entityType: 'ElectionPosition',
      entityId: position._id.toString(),
    });
  }
}
