// Roll Call — a standalone, special-feature screening tool: a 30-second live
// window where the parent taps "Call name" each time they call the child's
// name (parent tap is ground truth, same philosophy as the rest of the app —
// no acoustic attempt to separate parent's voice from child's), while the
// live MediaPipe + mic pipeline tallies how often the child oriented toward
// the camera and vocalized in response. Not part of the scored Matrix
// session — no trial count, no Matrix cells, just a tally and a summary.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisionDetector, resetVisionSession } from '../core/vision/visionSession.js';
import { computeRms, isVocalizing } from '../core/audio/vocalizationLevel.js';
import { useLanguage } from '../i18n/index.jsx';

const ROLL_CALL_SECONDS = 30;

export default function RollCallPage() {
  const navigate = useNavigate();
  const { strings } = useLanguage();
  const videoRef = useRef(null);
  const prevFacingRef = useRef(null);
  const prevVocalizingRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timeDomainBufferRef = useRef(null);
  const micStreamRef = useRef(null);
  const intervalRef = useRef(null);
  const finishedRef = useRef(false);

  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [secondsLeft, setSecondsLeft] = useState(ROLL_CALL_SECONDS);
  const [callCount, setCallCount] = useState(0);
  const [orientCount, setOrientCount] = useState(0);
  const [vocalCount, setVocalCount] = useState(0);
  const [eyeGlow, setEyeGlow] = useState(null);

  useEffect(() => {
    return () => {
      resetVisionSession();
      stopAudioGraph();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAudioGraph() {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    timeDomainBufferRef.current = null;
  }

  async function ensureAudioGraph() {
    if (audioContextRef.current) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextCtor();
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(micStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    timeDomainBufferRef.current = new Uint8Array(analyser.fftSize);
    micStreamRef.current = micStream;
  }

  function handleVisionFrame(signals) {
    // Orient-response tally: rising edge only, so a sustained gaze counts
    // once, not once per frame.
    if (signals.facing === 'camera' && prevFacingRef.current !== 'camera') {
      setOrientCount((n) => n + 1);
    }
    prevFacingRef.current = signals.facing;
    setEyeGlow(signals.facing === 'camera' ? signals.eyePositions : null);

    if (analyserRef.current && timeDomainBufferRef.current) {
      analyserRef.current.getByteTimeDomainData(timeDomainBufferRef.current);
      const rms = computeRms(timeDomainBufferRef.current);
      const vocalizing = isVocalizing(rms);
      if (vocalizing && !prevVocalizingRef.current) {
        setVocalCount((n) => n + 1);
      }
      prevVocalizingRef.current = vocalizing;
    }
  }

  async function handleStart() {
    setPhase('running');
    setCallCount(0);
    setOrientCount(0);
    setVocalCount(0);
    setSecondsLeft(ROLL_CALL_SECONDS);
    prevFacingRef.current = null;
    prevVocalizingRef.current = false;
    finishedRef.current = false;

    try {
      await ensureAudioGraph();
      await getVisionDetector().start(videoRef.current, handleVisionFrame, cameraFacing);
    } catch {
      setPhase('error');
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finalize();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function finalize() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    getVisionDetector().stop();
    stopAudioGraph();
    setEyeGlow(null);
    setPhase('done');
  }

  async function handleSwitchCamera() {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (phase !== 'running') return;
    getVisionDetector().stop();
    try {
      await getVisionDetector().start(videoRef.current, handleVisionFrame, nextFacing);
    } catch {
      setPhase('error');
    }
  }

  function handleCallName() {
    if (phase !== 'running') return;
    setCallCount((n) => n + 1);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(35); } catch {}
    }
  }

  function handleReset() {
    setPhase('idle');
    setCallCount(0);
    setOrientCount(0);
    setVocalCount(0);
    setSecondsLeft(ROLL_CALL_SECONDS);
  }

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">{strings.rollCall?.eyebrow || 'Special feature'}</p>
        <h1>{strings.rollCall?.title || '🗣️ Roll Call'}</h1>
        <p className="subtitle">
          {(strings.rollCall?.subtitle || "Call your child's name as many times as feels natural over {seconds} seconds. We'll tally how often they oriented toward you and vocalized in response.").replace('{seconds}', ROLL_CALL_SECONDS)}
        </p>
      </div>

      <div className="callout plain">
        <p>{strings.rollCall?.disclaimer}</p>
      </div>

      {phase === 'idle' && (
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={handleStart}>
            {(strings.rollCall?.startButton || 'Start Roll Call ({seconds}s)').replace('{seconds}', ROLL_CALL_SECONDS)}
          </button>
        </div>
      )}

      {phase === 'error' && (
        <p className="notice">{strings.rollCall?.errorLabel || 'Camera or microphone unavailable. Check permissions and try again.'}</p>
      )}

      {(phase === 'running' || phase === 'error') && (
        <>
          <div className="trial-badge">
            {(strings.rollCall?.secondsRemaining || '{seconds}s remaining').replace('{seconds}', secondsLeft)}
          </div>
          <div className="preview-frame">
            <video ref={videoRef} autoPlay playsInline muted />
            {eyeGlow && eyeGlow.map((pos, i) => (
              <div
                key={i}
                className="eye-glow-dot"
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                aria-hidden="true"
              />
            ))}
            <button
              type="button"
              className="camera-toggle"
              onClick={handleSwitchCamera}
              aria-label={strings.activityRun?.switchCameraLabel || 'Switch camera'}
              title={strings.activityRun?.switchCameraLabel || 'Switch camera'}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M9 4h1M14 4h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="matrix-legend" style={{ margin: '14px 0' }}>
            <span className="chip">{(strings.rollCall?.callsLabel || '📣 Calls: {count}').replace('{count}', callCount)}</span>
            <span className="chip">{(strings.rollCall?.orientedLabel || '👀 Oriented: {count}').replace('{count}', orientCount)}</span>
            <span className="chip">{(strings.rollCall?.vocalizedLabel || '🔊 Vocalized: {count}').replace('{count}', vocalCount)}</span>
          </div>

          {phase === 'running' && (
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={handleCallName}>
                {strings.rollCall?.callNameButton || '📣 Call name now'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={finalize}>
                {strings.rollCall?.stopEarlyButton || 'Stop early'}
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'done' && (
        <div className="section card">
          <h2 style={{ marginTop: 0 }}>{strings.rollCall?.summaryTitle || 'Roll Call summary'}</h2>
          <p>
            {(strings.rollCall?.summaryText || "You called your child's name {calls} time(s). They oriented toward the camera {oriented} time(s) and vocalized {vocal} time(s) during the window.")
              .replace('{calls}', callCount)
              .replace('{oriented}', orientCount)
              .replace('{vocal}', vocalCount)}
          </p>
          <p className="matrix-caption" style={{ margin: '10px 0 0' }}>
            {strings.rollCall?.summaryNote}
          </p>
        </div>
      )}

      <div className="actions inline" style={{ marginTop: 16 }}>
        {phase === 'done' && (
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {strings.rollCall?.tryAgain || 'Try again'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          {strings.rollCall?.backHome || 'Back to home'}
        </button>
      </div>
    </main>
  );
}
