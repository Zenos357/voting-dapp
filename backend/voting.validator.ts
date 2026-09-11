import { z } from 'zod';

export const castVoteSchema = z.object({
  body: z.object({
    votes: z.array(
      z.object({
        positionId: z.string().min(1, 'Position ID is required'),
        candidateId: z.string().min(1, 'Candidate ID is required'),
      })
    ).min(1, 'At least one vote selection must be provided'),
  }),
});
