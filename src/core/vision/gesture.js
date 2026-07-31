const FACE_CAMERA_THRESHOLD_DEG = 20;
const HEAD_TURN_THRESHOLD_DEG = 35;
const SMILE_THRESHOLD = 0.5;

export function classifyHeadOrientation(yawDeg) {
  const absYaw = Math.abs(yawDeg);
  if (absYaw <= FACE_CAMERA_THRESHOLD_DEG) return { facing: 'camera', yawDeg };
  if (absYaw >= HEAD_TURN_THRESHOLD_DEG) return { facing: 'away', yawDeg };
  return { facing: null, yawDeg };
}

function findScore(categories, name) {
  const found = categories.find((c) => c.categoryName === name);
  return found ? found.score : 0;
}

export function classifySmile(categories) {
  const left = findScore(categories, 'mouthSmileLeft');
  const right = findScore(categories, 'mouthSmileRight');
  return (left + right) / 2 > SMILE_THRESHOLD;
}

const WRIST = 0;
const INDEX_PIP = 6, INDEX_TIP = 8;
const MIDDLE_PIP = 10, MIDDLE_TIP = 12;
const RING_PIP = 14, RING_TIP = 16;
const PINKY_PIP = 18, PINKY_TIP = 20;
const EXTENSION_RATIO = 1.2;
const MOTION_THRESHOLD = 0.02;
const FRAME_CENTER = { x: 0.5, y: 0.5 };

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isExtended(landmarks, tipIndex, pipIndex) {
  const wrist = landmarks[WRIST];
  return dist(wrist, landmarks[tipIndex]) > dist(wrist, landmarks[pipIndex]) * EXTENSION_RATIO;
}

export function classifyHandPose(landmarks) {
  const indexExtended = isExtended(landmarks, INDEX_TIP, INDEX_PIP);
  const middleExtended = isExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
  const ringExtended = isExtended(landmarks, RING_TIP, RING_PIP);
  const pinkyExtended = isExtended(landmarks, PINKY_TIP, PINKY_PIP);

  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'point';
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) return 'open';
  return 'neutral';
}

function centroid(landmarks) {
  const sum = landmarks.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / landmarks.length, y: sum.y / landmarks.length };
}

export function classifyMotion(prevLandmarks, currLandmarks) {
  const prevDistFromCenter = dist(centroid(prevLandmarks), FRAME_CENTER);
  const currDistFromCenter = dist(centroid(currLandmarks), FRAME_CENTER);
  const delta = currDistFromCenter - prevDistFromCenter;
  const magnitude = Math.abs(delta);
  if (magnitude < MOTION_THRESHOLD) return { direction: null, magnitude };
  return { direction: delta < 0 ? 'toward' : 'away', magnitude };
}
