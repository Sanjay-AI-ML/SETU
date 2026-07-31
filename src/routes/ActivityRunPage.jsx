import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
import { getAudioContext, getDetector, resetAudioSession } from '../core/latency/audioSession.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');

function playServeTone(audioContext) {
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 660;
  oscillator.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
}

export default function ActivityRunPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useSessionDispatch();
  const audioAvailable = Boolean(location.state?.audioAvailable);
  const audioContextRef = useRef(null);
  const recordedRef = useRef(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  useEffect(() => {
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: bubbleTime.id });
    audioContextRef.current = getAudioContext();
  }, [dispatch]);

  async function handleServe() {
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    playServeTone(audioContext);
    const serveAt = markTime(audioContext);
    setPendingServeAt(serveAt);
    setPhase('waiting');
    recordedRef.current = false;

    if (audioAvailable) {
      getDetector().arm((detectedAt) => {
        recordTrial({ responded: true, source: 'audio-onset', returnAt: detectedAt, serveAt });
      });
    }
  }

  function recordTrial({ responded, source, returnAt: providedReturnAt, serveAt: providedServeAt }) {
    if (recordedRef.current) return;
    recordedRef.current = true;
    if (audioAvailable) {
      getDetector().disarm();
    }

    const audioContext = audioContextRef.current;
    const serveAt = providedServeAt ?? pendingServeAt;
    const returnAt = responded ? (providedReturnAt ?? markTime(audioContext)) : null;
    const latencyMs = responded ? computeLatencyMs(serveAt, returnAt) : null;

    dispatch({
      type: 'RECORD_TRIAL',
      index: trialIndex,
      serveAt,
      returnAt,
      returnSource: responded ? source : 'none',
      latencyMs,
      responded,
    });

    const nextIndex = trialIndex + 1;
    if (nextIndex >= bubbleTime.trialCount) {
      // Torn down here (end of activity) rather than in an effect cleanup:
      // React StrictMode double-invokes mount effects in dev, and an effect
      // cleanup would release the freshly-calibrated singleton session
      // between the two invocations, leaving the second mount uncalibrated.
      resetAudioSession();
      navigate('/session/activity/review');
      return;
    }
    setTrialIndex(nextIndex);
    setPhase('ready');
    setPendingServeAt(null);
  }

  return (
    <main>
      <h1>{bubbleTime.name}</h1>
      <p>
        {strings.activityRun.trialLabel
          .replace('{current}', trialIndex + 1)
          .replace('{total}', bubbleTime.trialCount)}
      </p>
      {!audioAvailable && <p>{strings.activityRun.micUnavailableLabel}</p>}
      {phase === 'ready' && <button onClick={handleServe}>{strings.activityRun.serveButton}</button>}
      {phase === 'waiting' && (
        <>
          <p>{strings.activityRun.waitingLabel}</p>
          <button onClick={() => recordTrial({ responded: true, source: 'parent-tap' })}>
            {strings.activityRun.respondedButton}
          </button>
          <button onClick={() => recordTrial({ responded: false, source: 'none' })}>
            {strings.activityRun.noResponseButton}
          </button>
        </>
      )}
    </main>
  );
}
