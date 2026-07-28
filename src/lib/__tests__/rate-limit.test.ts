import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit, getClientIp } from '../rate-limit';

function makeRequest(ip: string, method = 'POST'): Request {
  return new Request('https://schoolfinder.test/api/auth/login', {
    method,
    headers: { 'x-forwarded-for': ip },
  });
}

describe('getClientIp', () => {
  it('takes the first hop from x-forwarded-for', () => {
    const request = new Request('https://schoolfinder.test/', {
      headers: { 'x-forwarded-for': '41.210.1.1, 10.0.0.1, 172.16.0.1' },
    });
    expect(getClientIp(request)).toBe('41.210.1.1');
  });

  it('falls back to x-real-ip', () => {
    const request = new Request('https://schoolfinder.test/', {
      headers: { 'x-real-ip': '41.210.1.2' },
    });
    expect(getClientIp(request)).toBe('41.210.1.2');
  });

  it('reports unknown when no headers are present', () => {
    expect(getClientIp(new Request('https://schoolfinder.test/'))).toBe('unknown');
  });
});

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit then blocks', () => {
    // Unique scope per test — buckets are module-level and shared.
    const scope = `test-${Math.random()}`;
    const request = makeRequest('41.210.9.1');

    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(request, scope, { limit: 3, windowMs: 60_000 }).ok).toBe(true);
    }

    const blocked = rateLimit(request, scope, { limit: 3, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts each IP separately, so one abuser cannot lock everyone out', () => {
    const scope = `test-${Math.random()}`;
    const attacker = makeRequest('41.210.9.2');
    const bystander = makeRequest('41.210.9.3');

    rateLimit(attacker, scope, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(attacker, scope, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit(bystander, scope, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });

  it('keeps scopes independent, so login attempts do not consume the signup budget', () => {
    const suffix = Math.random();
    const request = makeRequest('41.210.9.4');

    rateLimit(request, `login-${suffix}`, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(request, `login-${suffix}`, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit(request, `signup-${suffix}`, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });

  it('resets once the window elapses', () => {
    const scope = `test-${Math.random()}`;
    const request = makeRequest('41.210.9.5');

    rateLimit(request, scope, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(request, scope, { limit: 1, windowMs: 60_000 }).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit(request, scope, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });

  it('reports the remaining budget', () => {
    const scope = `test-${Math.random()}`;
    const request = makeRequest('41.210.9.6');

    expect(rateLimit(request, scope, { limit: 3, windowMs: 60_000 }).remaining).toBe(2);
    expect(rateLimit(request, scope, { limit: 3, windowMs: 60_000 }).remaining).toBe(1);
  });
});
