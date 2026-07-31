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
