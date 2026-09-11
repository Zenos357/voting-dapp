import mongoose, { Schema, Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ELECTION_STATUS, ELECTION_TYPES } from '../constants/index.js';

export interface IElection extends Document {
  _id: Types.ObjectId;
  publicId: string;
  electionCode: string;
  name: string;
  description: string;
  type: string;
  nominationStartAt: Date;
  nominationEndAt: Date;
  votingStartAt: Date;
  votingEndAt: Date;
  resultPublishAt?: Date;
  status: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const electionSchema = new Schema<IElection>(
  {
    publicId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    electionCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(ELECTION_TYPES),
      default: ELECTION_TYPES.COLLEGE,
    },
    nominationStartAt: {
      type: Date,
      required: true,
    },
    nominationEndAt: {
      type: Date,
      required: true,
    },
    votingStartAt: {
      type: Date,
      required: true,
    },
    votingEndAt: {
      type: Date,
      required: true,
    },
    resultPublishAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(ELECTION_STATUS),
      default: ELECTION_STATUS.DRAFT,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete (ret as any).__v; return ret; } },
  }
);

electionSchema.index({ status: 1, isActive: 1 });
electionSchema.index({ votingStartAt: 1, votingEndAt: 1 });
electionSchema.index({ createdBy: 1 });

export const Election = mongoose.model<IElection>('Election', electionSchema);
