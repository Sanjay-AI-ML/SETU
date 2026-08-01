import { describe, it, expect } from 'vitest';
import { mapObservations } from './observationMapper.js';

describe('mapObservations', () => {
  it('maps bubble-time reach and point', () => {
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'open', motionDirection: 'toward' })).toEqual(['reach']);
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'point' })).toEqual(['point']);
  });

  it('maps peek-a-boo gaze-to-face and smile', () => {
    expect(mapObservations({ activityId: 'peek-a-boo', facing: 'camera' })).toEqual(['gaze-to-face']);
    expect(mapObservations({ activityId: 'peek-a-boo', smiling: true })).toEqual(['smile']);
    expect(mapObservations({ activityId: 'peek-a-boo', facing: 'camera', smiling: true })).toEqual(['gaze-to-face', 'smile']);
  });

  it('maps not-this-one head-turn and push-away', () => {
    expect(mapObservations({ activityId: 'not-this-one', facing: 'away' })).toEqual(['head-turn']);
    expect(mapObservations({ activityId: 'not-this-one', handPose: 'open', motionDirection: 'away' })).toEqual(['push-away']);
  });

  it('maps whats-in-the-box point and show', () => {
    expect(mapObservations({ activityId: 'whats-in-the-box', handPose: 'point' })).toEqual(['point']);
    expect(mapObservations({ activityId: 'whats-in-the-box', handPose: 'open' })).toEqual(['show']);
  });

  it('returns an empty array when nothing crosses a threshold', () => {
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'neutral', facing: null, smiling: false, motionDirection: null })).toEqual([]);
  });

  it('returns an empty array for an unknown activityId', () => {
    expect(mapObservations({ activityId: 'not-a-real-activity', facing: 'camera' })).toEqual([]);
  });

  it('does not fire reach without both handPose open AND motionDirection toward', () => {
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'open', motionDirection: null })).toEqual([]);
  });

  it('does not fire push-away without both handPose open AND motionDirection away', () => {
    expect(mapObservations({ activityId: 'not-this-one', handPose: 'open', motionDirection: null })).toEqual([]);
  });
});
