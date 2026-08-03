import { describe, it, expect, afterEach } from 'vitest';
import { isSetupTokenConfigured, isValidSetupToken } from '../admin-setup';

const ORIGINAL_ENV = { ...process.env };
const GOOD_TOKEN = 'a'.repeat(32);

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('isSetupTokenConfigured', () => {
  it('is false when unset', () => {
    delete process.env.ADMIN_SETUP_TOKEN;
    expect(isSetupTokenConfigured()).toBe(false);
  });

  it('is false for a short token', () => {
    // A guessable token is worse than none, because it makes the page reachable.
    process.env.ADMIN_SETUP_TOKEN = 'short';
    expect(isSetupTokenConfigured()).toBe(false);
  });

  it('is false one character below the minimum', () => {
    process.env.ADMIN_SETUP_TOKEN = 'a'.repeat(23);
    expect(isSetupTokenConfigured()).toBe(false);
  });

  it('is true at the minimum length', () => {
    process.env.ADMIN_SETUP_TOKEN = 'a'.repeat(24);
    expect(isSetupTokenConfigured()).toBe(true);
  });
});

describe('isValidSetupToken', () => {
  it('accepts the configured token', () => {
    process.env.ADMIN_SETUP_TOKEN = GOOD_TOKEN;
    expect(isValidSetupToken(GOOD_TOKEN)).toBe(true);
  });

  it('rejects a wrong token of the same length', () => {
    process.env.ADMIN_SETUP_TOKEN = GOOD_TOKEN;
    expect(isValidSetupToken('b'.repeat(32))).toBe(false);
  });

  it('rejects a prefix of the token', () => {
    process.env.ADMIN_SETUP_TOKEN = GOOD_TOKEN;
    expect(isValidSetupToken('a'.repeat(31))).toBe(false);
  });

  it('rejects missing input', () => {
    process.env.ADMIN_SETUP_TOKEN = GOOD_TOKEN;
    expect(isValidSetupToken(null)).toBe(false);
    expect(isValidSetupToken(undefined)).toBe(false);
    expect(isValidSetupToken('')).toBe(false);
  });

  it('rejects everything when no token is configured', () => {
    // Otherwise an unset variable would make every guess succeed — the exact
    // inversion that turns this page into a takeover route.
    delete process.env.ADMIN_SETUP_TOKEN;
    expect(isValidSetupToken('')).toBe(false);
    expect(isValidSetupToken('anything')).toBe(false);
    expect(isValidSetupToken(GOOD_TOKEN)).toBe(false);
  });

  it('rejects everything when the configured token is too short', () => {
    process.env.ADMIN_SETUP_TOKEN = 'short';
    expect(isValidSetupToken('short')).toBe(false);
  });
});
