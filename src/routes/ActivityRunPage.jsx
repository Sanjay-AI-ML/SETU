import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
import { getAudioContext, getDetector, hasActiveSession, resetAudioSession } from '../core/latency/audioSession.js';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

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
  const { session } = useSessionState();
  const audioAvailable = Boolean(location.state?.audioAvailable);
  const audioContextRef = useRef(null);
  const recordedRef = useRef(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  const currentActivity = session ? activities[session.activityRuns.length] : null;

  useEffect(() => {
    if (!currentActivity) return;
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: currentActivity.id });
    audioContextRef.current = getAudioContext();
    // currentActivity intentionally omitted: this must run exactly once per
    // page mount (one activity run per visit to this route), the same reason
    // the audio-session mount effect below has no cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Separate from the mount effect above (which intentionally has no
  // cleanup — see its comment in recordTrial). This effect only disarms
  // the detector on unmount (e.g. hardware/browser back mid-activity) so
  // a stray sound can't fire a phantom trial into an unmounted page. It
  // does NOT call resetAudioSession(), which would reintroduce the
  // StrictMode double-invoke hazard the mount effect's comment guards
  // against. hasActiveSession() guards against the normal-completion path,
  // where resetAudioSession() already ran and nulled the singleton —
  // without this guard, getDetector() would auto-vivify (and immediately
  // orphan) a brand-new AudioContext just to disarm it.
  useEffect(() => {
    return () => {
      if (audioAvailable && hasActiveSession()) {
        getDetector().disarm();
      }
    };
  }, [audioAvailable]);

  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

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
    if (nextIndex >= currentActivity.trialCount) {
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
      <h1>{currentActivity.name}</h1>
      <p>
        {strings.activityRun.trialLabel
          .replace('{current}', trialIndex + 1)
          .replace('{total}', currentActivity.trialCount)}
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
