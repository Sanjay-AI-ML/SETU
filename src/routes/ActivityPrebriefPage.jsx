import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import { getAudioContext, getDetector } from '../core/latency/audioSession.js';
import strings from '../i18n/en.json';

const CALIBRATION_MS = 1500;
const CALIBRATION_TIMEOUT_MS = 8000;

async function tryGetUserMedia(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

async function requestMediaPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { audioAvailable: true, visionAvailable: true };
  } catch {
    const audioAvailable = await tryGetUserMedia({ audio: true });
    const visionAvailable = await tryGetUserMedia({ video: true });
    return { audioAvailable, visionAvailable };
  }
}

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();
  const [calibrating, setCalibrating] = useState(false);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const currentActivity = activities[session.activityRuns.length];
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

  async function handleStart() {
    setCalibrating(true);
    const { audioAvailable: mediaAudioAvailable, visionAvailable } = await requestMediaPermissions();

    let audioAvailable = mediaAudioAvailable;
    if (audioAvailable) {
      try {
        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        await Promise.race([
          getDetector().calibrate(CALIBRATION_MS),
          new Promise((_, reject) => setTimeout(() => reject(new Error('calibration-timeout')), CALIBRATION_TIMEOUT_MS)),
        ]);
      } catch (error) {
        audioAvailable = false;
      }
    }

    setCalibrating(false);
    navigate('/session/activity/run', { state: { audioAvailable, visionAvailable } });
  }

  return (
    <main>
      <h1>{currentActivity.name}</h1>
      <p>{currentActivity.parentScript}</p>
      <h2>{strings.activityPrebrief.materialsLabel}</h2>
      <ul>
        {currentActivity.materials.map((material) => (
          <li key={material}>{material}</li>
        ))}
      </ul>
      {calibrating && <p>{strings.activityPrebrief.calibratingLabel}</p>}
      <button onClick={handleStart} disabled={calibrating}>
        {strings.activityPrebrief.startButton}
      </button>
    </main>
  );
}
