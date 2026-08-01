import { describe, it, expect } from 'vitest';
import { estimateVoiceRegister } from './voiceRegisterHeuristic.js';

describe('estimateVoiceRegister', () => {
  it('returns unknown for null/invalid pitch', () => {
    expect(estimateVoiceRegister(null).id).toBe('unknown');
    expect(estimateVoiceRegister(0).id).toBe('unknown');
    expect(estimateVoiceRegister(-10).id).toBe('unknown');
    expect(estimateVoiceRegister(NaN).id).toBe('unknown');
  });

  it('buckets a low pitch as lower-register', () => {
    expect(estimateVoiceRegister(120).id).toBe('lower-register');
  });

  it('buckets a mid pitch as mid-register', () => {
    expect(estimateVoiceRegister(220).id).toBe('mid-register');
  });

  it('buckets a higher pitch as higher-register', () => {
    expect(estimateVoiceRegister(350).id).toBe('higher-register');
  });

  it('buckets a very high pitch as very-high-register', () => {
    expect(estimateVoiceRegister(500).id).toBe('very-high-register');
  });

  it('rounds the reported pitch', () => {
    expect(estimateVoiceRegister(219.6).pitchHz).toBe(220);
  });
});
