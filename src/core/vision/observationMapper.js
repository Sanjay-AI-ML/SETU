export function mapObservations({ activityId, facing = null, smiling = false, handPose = 'neutral', motionDirection = null }) {
  const codes = [];

  if (activityId === 'bubble-time') {
    if (handPose === 'open' && motionDirection === 'toward') codes.push('reach');
    if (handPose === 'point') codes.push('point');
  } else if (activityId === 'peek-a-boo') {
    if (facing === 'camera') codes.push('gaze-to-face');
    if (smiling) codes.push('smile');
  } else if (activityId === 'not-this-one') {
    if (facing === 'away') codes.push('head-turn');
    if (handPose === 'open' && motionDirection === 'away') codes.push('push-away');
  } else if (activityId === 'whats-in-the-box') {
    if (handPose === 'point') codes.push('point');
    if (handPose === 'open') codes.push('show');
  } else if (activityId === 'call-and-response') {
    if (facing === 'camera') codes.push('name-response-orient');
    if (motionDirection === 'toward') codes.push('name-response-approach');
  }

  return codes;
}
