import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimatePitchHz } from '../core/audio/pitchEstimate.js';
import { estimateVoiceRegister } from '../core/audio/voiceRegisterHeuristic.js';
import { useLanguage } from '../i18n/index.jsx';

const RECORD_SECONDS = 5;
const SAMPLE_INTERVAL_MS = 150;

export default function VoiceAgeCheckPage() {
  const navigate = useNavigate();
  const { strings } = useLanguage();
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
        <p className="eyebrow">{strings.voiceAgeCheck?.eyebrow || 'Experimental — not part of assessment'}</p>
        <h1>{strings.voiceAgeCheck?.title || 'Voice register check'}</h1>
      </div>

      <div className="callout plain" style={{ borderLeftColor: 'var(--concern)' }}>
        <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.55 }}>
          {(strings.voiceAgeCheck?.disclaimer || 'This is a novelty feature, not a validated age predictor. It estimates pitch from {seconds} seconds of live audio using simple signal processing.').replace('{seconds}', RECORD_SECONDS)}
        </p>
      </div>

      {phase === 'idle' && (
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={handleStart}>
            🎙️ {(strings.voiceAgeCheck?.recordButton || 'Record {seconds}s and estimate').replace('{seconds}', RECORD_SECONDS)}
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div style={{ textAlignment: 'center', padding: '20px 0' }}>
          <span className="trial-badge" style={{ marginBottom: 20 }}>
            {(strings.voiceAgeCheck?.recordingLabel || '{seconds}s remaining — speak or vocalize naturally').replace('{seconds}', secondsLeft)}
          </span>
          <div className="waiting-stage">
            <div className="pulse-ring" aria-hidden="true" />
          </div>
        </div>
      )}

      {phase === 'error' && (
        <p className="notice">{strings.voiceAgeCheck?.errorLabel || 'Microphone unavailable. Check permissions and try again.'}</p>
      )}

      {phase === 'done' && result && (
        <div className="section card">
          <h2 style={{ marginTop: 0 }}>{result.label}</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-soft)' }}>{result.note}</p>
          {result.pitchHz != null && (
            <p className="matrix-caption" style={{ margin: '10px 0 0' }}>
              {(strings.voiceAgeCheck?.pitchLine || 'Estimated fundamental frequency: ~{pitch} Hz (median across the recording).').replace('{pitch}', result.pitchHz)}
            </p>
          )}
        </div>
      )}

      <div className="actions inline" style={{ marginTop: 16 }}>
        {phase === 'done' && (
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {strings.voiceAgeCheck?.tryAgain || 'Try again'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/settings')}>
          {strings.voiceAgeCheck?.backSettings || 'Back to Settings'}
        </button>
      </div>
    </main>
  );
}
