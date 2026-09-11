import { z } from 'zod';
import { ROLES } from '../constants/index.js';

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2).max(100),
    mobileNumber: z.string().optional(),
    roles: z.array(z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ELECTION_OFFICER, ROLES.CANDIDATE, ROLES.VOTER, ROLES.OBSERVER])).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    mobileNumber: z.string().optional(),
    roles: z.array(z.string()).optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
