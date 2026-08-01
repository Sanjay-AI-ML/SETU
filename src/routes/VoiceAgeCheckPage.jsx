// Experimental novelty feature: estimates a coarse "voice register" from a
// short live recording using autocorrelation pitch detection (no trained
// model — see core/audio/pitchEstimate.js and voiceRegisterHeuristic.js).
// Deliberately NOT reachable from the main HomePage flow, NOT part of any
// session, and NEVER feeds the Matrix, flags, or clinician report. Pitch is
// a weak, population-level correlate of age at best and is especially
// unreliable for pre-verbal infants — this page says so, repeatedly, rather
// than presenting a number that looks more meaningful than it is.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimatePitchHz } from '../core/audio/pitchEstimate.js';
import { estimateVoiceRegister } from '../core/audio/voiceRegisterHeuristic.js';

const RECORD_SECONDS = 5;
const SAMPLE_INTERVAL_MS = 150;

export default function VoiceAgeCheckPage() {
  const navigate = useNavigate();
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const floatBufferRef = useRef(null);
  const samplesRef = useRef([]);
  const sampleIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [phase, setPhase] = useState('idle'); // 'idle' | 'recording' | 'done' | 'error'
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    if (sampleIntervalRef.current) clearInterval(sampleIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    floatBufferRef.current = null;
  }

  function median(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  async function handleStart() {
    setPhase('recording');
    setResult(null);
    setSecondsLeft(RECORD_SECONDS);
    samplesRef.current = [];

    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(micStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      micStreamRef.current = micStream;
      floatBufferRef.current = new Float32Array(analyser.fftSize);
    } catch {
      setPhase('error');
      return;
    }

    sampleIntervalRef.current = setInterval(() => {
      analyserRef.current.getFloatTimeDomainData(floatBufferRef.current);
      const pitchHz = estimatePitchHz(floatBufferRef.current, audioContextRef.current.sampleRate);
      if (pitchHz != null) samplesRef.current.push(pitchHz);
    }, SAMPLE_INTERVAL_MS);

    countdownIntervalRef.current = setInterval(() => {
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
    stopAll();
    const medianPitch = median(samplesRef.current);
    setResult(estimateVoiceRegister(medianPitch));
    setPhase('done');
  }

  function handleReset() {
    setPhase('idle');
    setResult(null);
    setSecondsLeft(RECORD_SECONDS);
  }

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">Experimental — not part of assessment</p>
        <h1>Voice register check</h1>
      </div>

      <div className="callout plain" style={{ borderLeftColor: 'var(--concern)' }}>
        <p>
          <strong>This is a novelty feature, not a validated age predictor.</strong> It estimates
          pitch from {RECORD_SECONDS} seconds of live audio using simple signal processing (no
          trained model). Pitch loosely correlates with age at a population level but says very
          little about any one person — especially infants and pre-verbal toddlers, whose cry and
          babble acoustics don't map cleanly onto adult speech norms this kind of heuristic is
          usually built around. This result never feeds the Matrix, flags, or clinician report,
          and nothing recorded here is saved.
        </p>
      </div>

      {phase === 'idle' && (
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={handleStart}>
            Record {RECORD_SECONDS}s and estimate
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <>
          <div className="trial-badge">{secondsLeft}s remaining — speak or vocalize naturally</div>
          <div className="waiting-stage">
            <div className="pulse-ring" aria-hidden="true" />
          </div>
        </>
      )}

      {phase === 'error' && (
        <p className="notice">Microphone unavailable. Check permissions and try again.</p>
      )}

      {phase === 'done' && result && (
        <div className="section card">
          <h2 style={{ marginTop: 0 }}>{result.label}</h2>
          <p>{result.note}</p>
          {result.pitchHz != null && (
            <p className="matrix-caption" style={{ margin: '10px 0 0' }}>
              Estimated fundamental frequency: ~{result.pitchHz} Hz (median across the recording).
            </p>
          )}
        </div>
      )}

      <div className="actions inline" style={{ marginTop: 16 }}>
        {phase === 'done' && (
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Try again
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/settings')}>
          Back to Settings
        </button>
      </div>
    </main>
  );
}
