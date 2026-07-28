import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isValidWebhookSignature, isPaymentsConfigured } from '../flutterwave';

const ORIGINAL_ENV = { ...process.env };

describe('isValidWebhookSignature', () => {
  beforeEach(() => {
    process.env.FLUTTERWAVE_WEBHOOK_HASH = 'correct-horse-battery-staple';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('accepts the configured hash', () => {
    expect(isValidWebhookSignature('correct-horse-battery-staple')).toBe(true);
  });

  it('rejects a wrong hash', () => {
    expect(isValidWebhookSignature('wrong-horse-battery-staple')).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isValidWebhookSignature(null)).toBe(false);
    expect(isValidWebhookSignature('')).toBe(false);
  });

  it('rejects a prefix of the correct hash', () => {
    expect(isValidWebhookSignature('correct-horse')).toBe(false);
  });

  it('rejects everything when no hash is configured', () => {
    // Otherwise a deployment that forgot the secret would accept any webhook and
    // hand out free subscriptions.
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    expect(isValidWebhookSignature('anything')).toBe(false);
    expect(isValidWebhookSignature('')).toBe(false);
  });
});

describe('isPaymentsConfigured', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('requires both the secret key and the webhook hash', () => {
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    expect(isPaymentsConfigured()).toBe(false);

    process.env.FLUTTERWAVE_SECRET_KEY = 'sk_test';
    expect(isPaymentsConfigured()).toBe(false);

    process.env.FLUTTERWAVE_WEBHOOK_HASH = 'hash';
    expect(isPaymentsConfigured()).toBe(true);
  });
});
