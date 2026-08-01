import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import { getAudioContext, getDetector } from '../core/latency/audioSession.js';
import { useLanguage } from '../i18n/index.jsx';

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
  const { strings } = useLanguage();
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

  const actStrings = currentActivity ? strings.activities?.[currentActivity.id] : null;
  const activityName = actStrings?.name || currentActivity?.name;
  const parentScript = actStrings?.parentScript || currentActivity?.parentScript;
  const materials = actStrings?.materials || currentActivity?.materials || [];

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">{strings.activityPrebrief?.eyebrow || 'Up next'}</p>
        <h1>{activityName}</h1>
      </div>
      <div className="callout plain section">
        <p>{parentScript}</p>
      </div>
      <div className="section">
        <h2>{strings.activityPrebrief.materialsLabel}</h2>
        <ul className="card-list">
          {materials.map((material) => (
            <li key={material} className="card" style={{ padding: '11px 15px', fontSize: '0.92rem', color: 'var(--ink-soft)' }}>
              {material}
            </li>
          ))}
        </ul>
      </div>
      {calibrating && (
        <p className="notice">{strings.activityPrebrief.calibratingLabel}</p>
      )}
      <div className="actions">
        <button className="btn btn-primary" onClick={handleStart} disabled={calibrating}>
          {strings.activityPrebrief.startButton}
        </button>
      </div>
    </main>
  );
}
