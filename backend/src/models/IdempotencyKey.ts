import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIdempotencyKey extends Document {
  _id: Types.ObjectId;
  key: string;
  userId: Types.ObjectId;
  response: Record<string, unknown>;
  statusCode: number;
  createdAt: Date;
  expiresAt: Date;
}

const idempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    response: {
      type: Schema.Types.Mixed,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const IdempotencyKey = mongoose.model<IIdempotencyKey>('IdempotencyKey', idempotencyKeySchema);
