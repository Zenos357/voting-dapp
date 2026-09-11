import mongoose, { Schema, Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CANDIDATE_STATUS } from '../constants/index.js';

export interface ICandidate extends Document {
  _id: Types.ObjectId;
  publicId: string;
  userId: Types.ObjectId;
  electionId: Types.ObjectId;
  positionId: Types.ObjectId;
  candidateCode: string;
  fullName: string;
  profilePhotoUrl?: string;
  symbol?: string;
  manifesto?: string;
  description?: string;
  status: string;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    publicId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    candidateCode: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhotoUrl: {
      type: String,
    },
    symbol: {
      type: String,
    },
    manifesto: {
      type: String,
      maxlength: 5000,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(CANDIDATE_STATUS),
      default: CANDIDATE_STATUS.DRAFT,
    },
    submittedAt: Date,
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedReason: String,
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete (ret as any).__v; return ret; } },
  }
);

candidateSchema.index({ electionId: 1, positionId: 1, status: 1 });
candidateSchema.index({ electionId: 1, userId: 1, positionId: 1 }, { unique: true });
candidateSchema.index({ userId: 1 });

export const Candidate = mongoose.model<ICandidate>('Candidate', candidateSchema);
