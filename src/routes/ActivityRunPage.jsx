// src/routes/ActivityRunPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
import { getAudioContext, getDetector, hasActiveSession, resetAudioSession } from '../core/latency/audioSession.js';
import { getVisionDetector, hasActiveVisionSession, resetVisionSession } from '../core/vision/visionSession.js';
import { mapObservations } from '../core/vision/observationMapper.js';
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
  const visionAvailable = Boolean(location.state?.visionAvailable);
  const audioContextRef = useRef(null);
  const recordedRef = useRef(false);
  const videoRef = useRef(null);
  const visionCodesRef = useRef(new Set());
  const [visionActive, setVisionActive] = useState(visionAvailable);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  const currentActivity = session ? activities[session.activityRuns.length] : null;

  function handleVisionFrame(signals) {
    if (!currentActivity) return;
    const codes = mapObservations({ activityId: currentActivity.id, ...signals });
    codes.forEach((code) => visionCodesRef.current.add(code));
  }

  async function handleSwitchCamera() {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    getVisionDetector().stop();
    try {
      await getVisionDetector().start(videoRef.current, handleVisionFrame, nextFacing);
      setVisionActive(true);
    } catch {
      setVisionActive(false);
    }
  }

  useEffect(() => {
    if (!currentActivity) return;
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: currentActivity.id });
    audioContextRef.current = getAudioContext();
    if (visionAvailable) {
      getVisionDetector()
        .start(videoRef.current, handleVisionFrame, cameraFacing)
        .catch(() => setVisionActive(false));
    }
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
      if (visionAvailable && hasActiveVisionSession()) {
        getVisionDetector().stop();
      }
    };
  }, [audioAvailable, visionAvailable]);

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
      if (visionAvailable) {
        resetVisionSession();
      }
      navigate('/session/activity/review', {
        state: { visionSuggestedCodes: Array.from(visionCodesRef.current) },
      });
      return;
    }
    setTrialIndex(nextIndex);
    setPhase('ready');
    setPendingServeAt(null);
  }

  return (
    <main>
      <div className="screen-head">
        <span className="trial-badge">
          {strings.activityRun.trialLabel
            .replace('{current}', trialIndex + 1)
            .replace('{total}', currentActivity.trialCount)}
        </span>
        <h1>{currentActivity.name}</h1>
      </div>
      {!audioAvailable && <p className="notice">{strings.activityRun.micUnavailableLabel}</p>}
      {!visionActive && <p className="notice">{strings.activityRun.visionUnavailableLabel}</p>}
      {visionActive && (
        <div className="preview-frame">
          <video ref={videoRef} autoPlay playsInline muted />
          <button
            type="button"
            className="camera-toggle"
            onClick={handleSwitchCamera}
            aria-label={strings.activityRun.switchCameraLabel}
            title={strings.activityRun.switchCameraLabel}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 4h1M14 4h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
      <div className="spacer" />
      {phase === 'ready' && (
        <div className="actions">
          <button className="btn btn-primary" onClick={handleServe}>{currentActivity.serveButtonLabel}</button>
        </div>
      )}
      {phase === 'waiting' && (
        <div className="waiting-stage">
          <div className="pulse-ring" aria-hidden="true" />
          <p>{strings.activityRun.waitingLabel}</p>
          <div className="actions" style={{ paddingTop: 0, width: '100%' }}>
            <button className="btn btn-primary" onClick={() => recordTrial({ responded: true, source: 'parent-tap' })}>
              {strings.activityRun.respondedButton}
            </button>
            <button className="btn btn-secondary" onClick={() => recordTrial({ responded: false, source: 'none' })}>
              {strings.activityRun.noResponseButton}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
