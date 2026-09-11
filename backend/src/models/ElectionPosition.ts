import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IElectionPosition extends Document {
  _id: Types.ObjectId;
  electionId: Types.ObjectId;
  name: string;
  description: string;
  maxVotesAllowed: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const electionPositionSchema = new Schema<IElectionPosition>(
  {
    electionId: {
      type: Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    maxVotesAllowed: {
      type: Number,
      default: 1,
      min: 1,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { delete (ret as any).__v; return ret; } },
  }
);

electionPositionSchema.index({ electionId: 1, name: 1 }, { unique: true });

export const ElectionPosition = mongoose.model<IElectionPosition>('ElectionPosition', electionPositionSchema);
