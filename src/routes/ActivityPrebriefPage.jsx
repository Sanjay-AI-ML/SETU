import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { getAudioContext, getDetector } from '../core/latency/audioSession.js';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');
const CALIBRATION_MS = 1500;

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();
  const [calibrating, setCalibrating] = useState(false);

  async function handleStart() {
    setCalibrating(true);
    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    let audioAvailable = true;
    try {
      await getDetector().calibrate(CALIBRATION_MS);
    } catch (error) {
      audioAvailable = false;
    }

    navigate('/session/activity/run', { state: { audioAvailable } });
  }

  return (
    <main>
      <h1>{bubbleTime.name}</h1>
      <p>{bubbleTime.parentScript}</p>
      <h2>{strings.activityPrebrief.materialsLabel}</h2>
      <ul>
        {bubbleTime.materials.map((material) => (
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
