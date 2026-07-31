import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
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
  const dispatch = useSessionDispatch();
  const audioContextRef = useRef(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  useEffect(() => {
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: bubbleTime.id });
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, [dispatch]);

  function handleServe() {
    const audioContext = audioContextRef.current;
    playServeTone(audioContext);
    setPendingServeAt(markTime(audioContext));
    setPhase('waiting');
  }

  function recordTrial({ responded }) {
    const audioContext = audioContextRef.current;
    const returnAt = responded ? markTime(audioContext) : null;
    const latencyMs = responded ? computeLatencyMs(pendingServeAt, returnAt) : null;

    dispatch({
      type: 'RECORD_TRIAL',
      index: trialIndex,
      serveAt: pendingServeAt,
      returnAt,
      returnSource: responded ? 'parent-tap' : 'none',
      latencyMs,
      responded,
    });

    const nextIndex = trialIndex + 1;
    if (nextIndex >= bubbleTime.trialCount) {
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
      {phase === 'ready' && <button onClick={handleServe}>{strings.activityRun.serveButton}</button>}
      {phase === 'waiting' && (
        <>
          <p>{strings.activityRun.waitingLabel}</p>
          <button onClick={() => recordTrial({ responded: true })}>
            {strings.activityRun.respondedButton}
          </button>
          <button onClick={() => recordTrial({ responded: false })}>
            {strings.activityRun.noResponseButton}
          </button>
        </>
      )}
    </main>
  );
}
