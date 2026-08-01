import { get, set } from 'idb-keyval';

const CONSENT_KEY = 'setu:consent-ack';

export function getConsent() {
  return get(CONSENT_KEY).then((value) => value === true);
}

export function setConsent(value) {
  return set(CONSENT_KEY, value);
}

const LANGUAGE_KEY = 'setu:language';

export function getLanguage() {
  return get(LANGUAGE_KEY).then((value) => value ?? 'en');
}

export function setLanguage(lang) {
  return set(LANGUAGE_KEY, lang);
}

const CHILD_PROFILE_KEY = 'setu:child-profile';

export function getChildProfile() {
  return get(CHILD_PROFILE_KEY).then((value) => value ?? null);
}

export function setChildProfile(profile) {
  return set(CHILD_PROFILE_KEY, profile);
}

const SESSIONS_KEY = 'setu:sessions';

export function getSessions() {
  return get(SESSIONS_KEY).then((value) => (Array.isArray(value) ? value : []));
}

export async function saveSession(session) {
  if (!session?.id) return;
  const sessions = await getSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session);
  }
  await set(SESSIONS_KEY, sessions);
}

export async function deleteSession(sessionId) {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await set(SESSIONS_KEY, filtered);
}

export function clearChildProfile() {
  return set(CHILD_PROFILE_KEY, null);
}

export function clearConsent() {
  return set(CONSENT_KEY, null);
}

export async function clearAllData() {
  await set(CHILD_PROFILE_KEY, null);
  await set(ACTIVE_SESSION_KEY, null);
  await set(SESSIONS_KEY, []);
}

const ACTIVE_SESSION_KEY = 'setu:active-session';

export function getActiveSession() {
  return get(ACTIVE_SESSION_KEY).then((value) => value ?? null);
}

export function setActiveSession(session) {
  return set(ACTIVE_SESSION_KEY, session);
}

export function clearActiveSession() {
  return set(ACTIVE_SESSION_KEY, null);
}

