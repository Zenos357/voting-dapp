import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../utils/jwt.js';
import { ROLES } from '../constants/roles.js';

describe('Authentication & Token Security', () => {
  it('should generate a valid JWT with sub, userId and roles', () => {
    const token = signAccessToken('user123', 'john_doe', [ROLES.VOTER]);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('user123');
    expect(decoded.username).toBe('john_doe');
    expect(decoded.roles).toContain(ROLES.VOTER);
    expect(decoded.jti).toBeDefined();
  });
});
