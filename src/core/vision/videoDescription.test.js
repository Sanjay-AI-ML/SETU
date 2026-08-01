import { describe, it, expect } from 'vitest';
import { describeClip, formatTimestamp } from './videoDescription.js';

function frame(overrides = {}) {
  return { facing: null, smiling: false, handPose: 'neutral', motionDirection: null, ...overrides };
}

describe('describeClip', () => {
  it('returns no events for an unchanging neutral clip', () => {
    const frames = [frame(), frame(), frame()];
    expect(describeClip(frames, [0, 1, 2])).toEqual([]);
  });

  it('emits one event per rising edge, not one per frame', () => {
    const frames = [
      frame({ facing: 'camera' }),
      frame({ facing: 'camera' }),
      frame({ facing: 'camera' }),
    ];
    const events = describeClip(frames, [0, 1, 2]);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ t: 0, code: 'oriented-camera' });
  });

  it('emits a new event when a signal re-triggers after dropping', () => {
    const frames = [
      frame({ smiling: true }),
      frame({ smiling: false }),
      frame({ smiling: true }),
    ];
    const events = describeClip(frames, [0, 1, 2]);
    expect(events.filter((e) => e.code === 'smiled')).toHaveLength(2);
  });

  it('captures hand pose, motion, and vocalization events with correct codes', () => {
    const frames = [
      frame({ handPose: 'point' }),
      frame({ handPose: 'open', motionDirection: 'toward' }),
      frame({ motionDirection: 'away' }),
    ];
    const vocalizingFlags = [false, true, false];
    const events = describeClip(frames, [1, 2, 3], vocalizingFlags);
    expect(events.map((e) => e.code)).toEqual(
      expect.arrayContaining(['pointed', 'reached', 'moved-toward', 'vocalized', 'moved-away'])
    );
  });

  it('sorts events by timestamp', () => {
    const frames = [frame({ smiling: true }), frame({ facing: 'camera' })];
    const events = describeClip(frames, [5, 1]);
    expect(events.map((e) => e.t)).toEqual([1, 5]);
  });
});

describe('formatTimestamp', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(9)).toBe('0:09');
    expect(formatTimestamp(65)).toBe('1:05');
    expect(formatTimestamp(125.7)).toBe('2:05');
  });
});
