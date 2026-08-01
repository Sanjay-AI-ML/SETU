import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key) => Promise.resolve(store.get(key))),
  set: vi.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
}));

const {
  getConsent,
  setConsent,
  getChildProfile,
  setChildProfile,
  getSessions,
  saveSession,
  deleteSession,
  getActiveSession,
  setActiveSession,
  clearActiveSession,
} = await import('./index.js');

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

describe('core/storage session history', () => {
  it('returns empty array when no sessions are saved', async () => {
    await expect(getSessions()).resolves.toEqual([]);
  });

  it('saves and retrieves sessions', async () => {
    const session1 = { id: 'sess-1', childId: 'c-1', activityRuns: [] };
    const session2 = { id: 'sess-2', childId: 'c-1', activityRuns: [] };
    await saveSession(session1);
    await saveSession(session2);
    const sessions = await getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toEqual(session2);
    expect(sessions[1]).toEqual(session1);
  });

  it('updates existing session and deletes session', async () => {
    const session1 = { id: 'sess-1', childId: 'c-1', activityRuns: [] };
    await saveSession(session1);
    const updated = { ...session1, activityRuns: [{ id: 'run-1' }] };
    await saveSession(updated);
    let sessions = await getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].activityRuns).toHaveLength(1);

    await deleteSession('sess-1');
    sessions = await getSessions();
    expect(sessions).toHaveLength(0);
  });
});

describe('core/storage active session', () => {
  it('manages active session state', async () => {
    await expect(getActiveSession()).resolves.toBeNull();
    const active = { id: 'active-1', activityRuns: [] };
    await setActiveSession(active);
    await expect(getActiveSession()).resolves.toEqual(active);
    await clearActiveSession();
    await expect(getActiveSession()).resolves.toBeNull();
  });
});
