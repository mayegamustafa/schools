import { describe, it, expect } from 'vitest';
import { createAuthToken, verifyAuthToken, normalizeRole, getBearerToken, requireAuth } from '../auth';

const user = {
  id: 'usr_1',
  name: 'Grace Nakamya',
  email: 'grace@example.ac.ug',
  role: 'school',
};

describe('normalizeRole', () => {
  it('maps legacy role names onto the current ones', () => {
    expect(normalizeRole('parent')).toBe('user');
    expect(normalizeRole('school_admin')).toBe('school');
  });

  it('treats a missing role as guest', () => {
    expect(normalizeRole(null)).toBe('guest');
    expect(normalizeRole(undefined)).toBe('guest');
    expect(normalizeRole('')).toBe('guest');
  });

  it('passes current roles through', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('user')).toBe('user');
  });
});

describe('token round trip', () => {
  it('signs and verifies a token', async () => {
    const token = await createAuthToken(user);
    const claims = await verifyAuthToken(token);

    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('usr_1');
    expect(claims?.email).toBe('grace@example.ac.ug');
    expect(claims?.role).toBe('school');
  });

  it('rejects a tampered token', async () => {
    const token = await createAuthToken(user);
    // Flip a character in the payload segment.
    const [header, payload, signature] = token.split('.');
    const tampered = `${header}.${payload.slice(0, -2)}XY.${signature}`;

    expect(await verifyAuthToken(tampered)).toBeNull();
  });

  it('rejects rubbish', async () => {
    expect(await verifyAuthToken('not-a-token')).toBeNull();
    expect(await verifyAuthToken('')).toBeNull();
  });

  it('normalises legacy roles on the way out', async () => {
    const token = await createAuthToken({ ...user, role: 'parent' });
    const claims = await verifyAuthToken(token);
    expect(claims?.role).toBe('user');
  });
});

describe('getBearerToken', () => {
  it('extracts a bearer token', () => {
    const request = new Request('https://schoolfinder.test/api/x', {
      headers: { authorization: 'Bearer abc.def.ghi' },
    });
    expect(getBearerToken(request)).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the scheme', () => {
    const request = new Request('https://schoolfinder.test/api/x', {
      headers: { authorization: 'bearer abc.def.ghi' },
    });
    expect(getBearerToken(request)).toBe('abc.def.ghi');
  });

  it('ignores other schemes and malformed headers', () => {
    const basic = new Request('https://schoolfinder.test/api/x', {
      headers: { authorization: 'Basic abc' },
    });
    expect(getBearerToken(basic)).toBeNull();
    expect(getBearerToken(new Request('https://schoolfinder.test/api/x'))).toBeNull();
  });
});

describe('requireAuth', () => {
  it('rejects an unauthenticated request', async () => {
    const result = await requireAuth(new Request('https://schoolfinder.test/api/x', { method: 'POST' }));
    expect('response' in result).toBe(true);
    if ('response' in result) expect(result.response.status).toBe(401);
  });

  it('accepts a valid bearer token', async () => {
    const token = await createAuthToken(user);
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      })
    );

    expect('claims' in result).toBe(true);
    if ('claims' in result) expect(result.claims.sub).toBe('usr_1');
  });

  it('falls back to the cookie when the bearer header is stale', async () => {
    // The web client sends no Authorization header at all now; this also covers
    // an old build sending a leftover value.
    const token = await createAuthToken(user);
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'POST',
        headers: {
          authorization: 'Bearer stale-nonsense',
          cookie: `sf_token=${token}`,
        },
      })
    );

    expect('claims' in result).toBe(true);
  });

  it('enforces role restrictions', async () => {
    const token = await createAuthToken({ ...user, role: 'user' });
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }),
      ['admin']
    );

    expect('response' in result).toBe(true);
    if ('response' in result) expect(result.response.status).toBe(403);
  });

  it('blocks a cross-origin cookie-authenticated write (CSRF)', async () => {
    const token = await createAuthToken(user);
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'POST',
        headers: {
          origin: 'https://evil.example.com',
          cookie: `sf_token=${token}`,
        },
      })
    );

    expect('response' in result).toBe(true);
    if ('response' in result) expect(result.response.status).toBe(403);
  });

  it('allows a same-origin write', async () => {
    const token = await createAuthToken(user);
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'POST',
        headers: {
          origin: 'https://schoolfinder.test',
          cookie: `sf_token=${token}`,
        },
      })
    );

    expect('claims' in result).toBe(true);
  });

  it('allows cross-origin reads', async () => {
    const token = await createAuthToken(user);
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'GET',
        headers: {
          origin: 'https://evil.example.com',
          cookie: `sf_token=${token}`,
        },
      })
    );

    expect('claims' in result).toBe(true);
  });

  it('exempts bearer-authenticated writes, which is how the mobile app calls in', async () => {
    const token = await createAuthToken(user);
    const result = await requireAuth(
      new Request('https://schoolfinder.test/api/x', {
        method: 'POST',
        headers: {
          origin: 'https://evil.example.com',
          authorization: `Bearer ${token}`,
        },
      })
    );

    expect('claims' in result).toBe(true);
  });
});
