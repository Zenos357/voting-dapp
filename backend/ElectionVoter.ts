import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IElectionVoter extends Document {
  _id: Types.ObjectId;
  electionId: Types.ObjectId;
  userId: Types.ObjectId;
  voterNumber: string;
  isEligible: boolean;
  eligibilityStatus: string;
  hasVoted: boolean;
  votedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const electionVoterSchema = new Schema<IElectionVoter>(
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
    voterNumber: {
      type: String,
      required: true,
      trim: true,
    },
    isEligible: {
      type: Boolean,
      default: true,
    },
    eligibilityStatus: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'SUSPENDED'],
      default: 'ELIGIBLE',
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    votedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete (ret as any).__v; return ret; } },
  }
);

// CRITICAL: unique compound index to prevent duplicate voter registration per election
electionVoterSchema.index({ electionId: 1, userId: 1 }, { unique: true });
electionVoterSchema.index({ electionId: 1, isEligible: 1 });
electionVoterSchema.index({ electionId: 1, hasVoted: 1 });

export const ElectionVoter = mongoose.model<IElectionVoter>('ElectionVoter', electionVoterSchema);
