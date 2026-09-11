import { z } from 'zod';
import { ELECTION_TYPES } from '../constants/index.js';

export const createElectionSchema = z.object({
  body: z
    .object({
      electionCode: z.string().min(2).max(30).toUpperCase(),
      name: z.string().min(3).max(200),
      description: z.string().optional(),
      type: z.enum([ELECTION_TYPES.NATIONAL, ELECTION_TYPES.STATE, ELECTION_TYPES.MUNICIPAL, ELECTION_TYPES.COLLEGE, ELECTION_TYPES.ORGANIZATION, ELECTION_TYPES.MOCK, ELECTION_TYPES.OTHER]).optional(),
      nominationStartAt: z.string().datetime(),
      nominationEndAt: z.string().datetime(),
      votingStartAt: z.string().datetime(),
      votingEndAt: z.string().datetime(),
      resultPublishAt: z.string().datetime().optional(),
    })
    .refine((data) => new Date(data.nominationStartAt) < new Date(data.nominationEndAt), {
      message: 'Nomination start date must be before nomination end date',
      path: ['nominationStartAt'],
    })
    .refine((data) => new Date(data.nominationEndAt) <= new Date(data.votingStartAt), {
      message: 'Nomination must end before or when voting starts',
      path: ['nominationEndAt'],
    })
    .refine((data) => new Date(data.votingStartAt) < new Date(data.votingEndAt), {
      message: 'Voting start date must be before voting end date',
      path: ['votingStartAt'],
    }),
});

export const updateElectionSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(200).optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    nominationStartAt: z.string().datetime().optional(),
    nominationEndAt: z.string().datetime().optional(),
    votingStartAt: z.string().datetime().optional(),
    votingEndAt: z.string().datetime().optional(),
    resultPublishAt: z.string().datetime().optional(),
  }),
});

export const createPositionSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    maxVotesAllowed: z.number().int().min(1).default(1),
    displayOrder: z.number().int().min(0).default(0),
  }),
});

export const updatePositionSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    maxVotesAllowed: z.number().int().min(1).optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});
