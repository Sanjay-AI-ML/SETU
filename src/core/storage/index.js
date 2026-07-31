import { get, set } from 'idb-keyval';

const CONSENT_KEY = 'setu:consent-ack';

export function getConsent() {
  return get(CONSENT_KEY).then((value) => value === true);
}

export function setConsent(value) {
  return set(CONSENT_KEY, value);
}

const CHILD_PROFILE_KEY = 'setu:child-profile';

export function getChildProfile() {
  return get(CHILD_PROFILE_KEY).then((value) => value ?? null);
}

export function setChildProfile(profile) {
  return set(CHILD_PROFILE_KEY, profile);
}
