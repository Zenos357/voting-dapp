import { z } from 'zod';

export const createCandidateSchema = z.object({
  body: z.object({
    positionId: z.string().min(1, 'Position is required'),
    candidateCode: z.string().min(1, 'Candidate code is required'),
    fullName: z.string().min(2).max(100),
    symbol: z.string().optional(),
    manifesto: z.string().max(5000).optional(),
    description: z.string().max(1000).optional(),
  }),
});

export const updateCandidateSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    symbol: z.string().optional(),
    manifesto: z.string().max(5000).optional(),
    description: z.string().max(1000).optional(),
  }),
});

export const rejectCandidateSchema = z.object({
  body: z.object({
    rejectedReason: z.string().min(3, 'Reason for rejection is required'),
  }),
});
