export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  ELECTION_OFFICER: 'ELECTION_OFFICER',
  CANDIDATE: 'CANDIDATE',
  VOTER: 'VOTER',
  OBSERVER: 'OBSERVER',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<RoleCode, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  ELECTION_OFFICER: 60,
  CANDIDATE: 40,
  VOTER: 20,
  OBSERVER: 10,
};

export const ALL_ROLES = Object.values(ROLES);
