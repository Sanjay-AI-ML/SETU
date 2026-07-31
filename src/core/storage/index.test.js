import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key) => Promise.resolve(store.get(key))),
  set: vi.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
}));

const { getConsent, setConsent, getChildProfile, setChildProfile } = await import('./index.js');

beforeEach(() => {
  store.clear();
});

describe('core/storage consent', () => {
  it('returns false when no consent has been recorded', async () => {
    await expect(getConsent()).resolves.toBe(false);
  });

  it('returns true after consent has been set', async () => {
    await setConsent(true);
    await expect(getConsent()).resolves.toBe(true);
  });

  it('returns false if consent was explicitly set to false', async () => {
    await setConsent(false);
    await expect(getConsent()).resolves.toBe(false);
  });
});

describe('core/storage child profile', () => {
  it('returns null when no child profile has been saved', async () => {
    await expect(getChildProfile()).resolves.toBeNull();
  });

  it('returns the saved profile after setChildProfile', async () => {
    const profile = { id: 'child-1', displayName: 'Demo Child', ageMonths: 24 };
    await setChildProfile(profile);
    await expect(getChildProfile()).resolves.toEqual(profile);
  });
});
