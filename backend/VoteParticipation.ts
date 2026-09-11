import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVoteParticipation extends Document {
  _id: Types.ObjectId;
  electionId: Types.ObjectId;
  userId: Types.ObjectId;
  status: string;
  votedAt: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const voteParticipationSchema = new Schema<IVoteParticipation>(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'FAILED'],
      default: 'COMPLETED',
    },
    votedAt: {
      type: Date,
      default: () => new Date(),
    },
    idempotencyKey: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Primary duplicate vote prevention at database level
voteParticipationSchema.index({ electionId: 1, userId: 1 }, { unique: true });

export const VoteParticipation = mongoose.model<IVoteParticipation>('VoteParticipation', voteParticipationSchema);
