import { get, set } from 'idb-keyval';

const CONSENT_KEY = 'setu:consent-ack';

export function getConsent() {
  return get(CONSENT_KEY).then((value) => value === true);
}

export function setConsent(value) {
  return set(CONSENT_KEY, value);
}
