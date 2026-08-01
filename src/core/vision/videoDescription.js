// Turns the same frame-by-frame vision/audio signals the screening summary
// uses into a plain, timestamped timeline of what was observed — general
// on-device description, not interpretation. Each entry is a rising edge
// (a state starting), so a sustained pose/sound produces one entry, not one
// per frame. Returns event codes, not text, so callers can translate them —
// see i18n videoCheck.events.*.

export function describeClip(frameSamples, timestamps, vocalizingFlags = []) {
  const events = [];
  let prevFacing = null;
  let prevSmiling = false;
  let prevHandPose = 'neutral';
  let prevMotion = null;
  let prevVocal = false;

  frameSamples.forEach((f, i) => {
    const t = timestamps[i] ?? 0;

    if (f.facing === 'camera' && prevFacing !== 'camera') events.push({ t, code: 'oriented-camera' });
    if (f.facing === 'away' && prevFacing !== 'away') events.push({ t, code: 'looked-away' });
    if (f.smiling && !prevSmiling) events.push({ t, code: 'smiled' });
    if (f.handPose === 'point' && prevHandPose !== 'point') events.push({ t, code: 'pointed' });
    if (f.handPose === 'open' && prevHandPose !== 'open') events.push({ t, code: 'reached' });
    if (f.motionDirection === 'toward' && prevMotion !== 'toward') events.push({ t, code: 'moved-toward' });
    if (f.motionDirection === 'away' && prevMotion !== 'away') events.push({ t, code: 'moved-away' });

    const vocal = vocalizingFlags[i] ?? false;
    if (vocal && !prevVocal) events.push({ t, code: 'vocalized' });

    prevFacing = f.facing;
    prevSmiling = f.smiling;
    prevHandPose = f.handPose;
    prevMotion = f.motionDirection;
    prevVocal = vocal;
  });

  return events.sort((a, b) => a.t - b.t);
}

export function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
