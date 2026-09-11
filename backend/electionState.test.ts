import { describe, it, expect } from 'vitest';
import { isValidTransition, VALID_TRANSITIONS, ELECTION_STATUS } from '../constants/electionStatus.js';

describe('Election State Machine', () => {
  it('should allow valid sequential transitions', () => {
    expect(isValidTransition(ELECTION_STATUS.DRAFT, ELECTION_STATUS.NOMINATION_OPEN)).toBe(true);
    expect(isValidTransition(ELECTION_STATUS.NOMINATION_OPEN, ELECTION_STATUS.NOMINATION_CLOSED)).toBe(true);
    expect(isValidTransition(ELECTION_STATUS.NOMINATION_CLOSED, ELECTION_STATUS.READY_FOR_VOTING)).toBe(true);
    expect(isValidTransition(ELECTION_STATUS.READY_FOR_VOTING, ELECTION_STATUS.VOTING_LIVE)).toBe(true);
    expect(isValidTransition(ELECTION_STATUS.VOTING_LIVE, ELECTION_STATUS.VOTING_CLOSED)).toBe(true);
    expect(isValidTransition(ELECTION_STATUS.VOTING_CLOSED, ELECTION_STATUS.RESULT_PUBLISHED)).toBe(true);
  });

  it('should reject invalid backward or jump transitions', () => {
    expect(isValidTransition(ELECTION_STATUS.DRAFT, ELECTION_STATUS.VOTING_LIVE)).toBe(false);
    expect(isValidTransition(ELECTION_STATUS.DRAFT, ELECTION_STATUS.RESULT_PUBLISHED)).toBe(false);
    expect(isValidTransition(ELECTION_STATUS.VOTING_LIVE, ELECTION_STATUS.DRAFT)).toBe(false);
    expect(isValidTransition(ELECTION_STATUS.RESULT_PUBLISHED, ELECTION_STATUS.VOTING_LIVE)).toBe(false);
  });
});
