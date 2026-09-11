import mongoose, { Schema, Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IVoteBallot extends Document {
  _id: Types.ObjectId;
  publicVoteId: string;
  electionId: Types.ObjectId;
  positionId: Types.ObjectId;
  candidateId: Types.ObjectId;
  ballotReference: string;
  castAt: Date;
  createdAt: Date;
}

function generateBallotRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) ref += '-';
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

const voteBallotSchema = new Schema<IVoteBallot>(
  {
    publicVoteId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    positionId: {
      type: Schema.Types.ObjectId,
      ref: 'ElectionPosition',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    ballotReference: {
      type: String,
      default: generateBallotRef,
      unique: true,
    },
    castAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// NOTE: No userId field — ballot is separated from voter identity for secrecy
voteBallotSchema.index({ electionId: 1, positionId: 1, candidateId: 1 });
voteBallotSchema.index({ electionId: 1, positionId: 1 });

export const VoteBallot = mongoose.model<IVoteBallot>('VoteBallot', voteBallotSchema);
