// A standalone screening entry point: parent picks or records a short clip
// (up to ~30s) from the gallery/camera, and it's analysed entirely on-device
// with the same MediaPipe pipeline the guided activities use — the file
// itself never leaves the device and is never uploaded or persisted.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisionDetector, resetVisionSession } from '../core/vision/visionSession.js';
import { summarizeFrames, interpretSummary, summarizeVocalization, interpretVocalization } from '../core/vision/videoScreening.js';
import { computeRms, isVocalizing } from '../core/audio/vocalizationLevel.js';
import { useLanguage } from '../i18n/index.jsx';

const MAX_CLIP_SECONDS = 30;

export default function VideoCheckPage() {
  const navigate = useNavigate();
  const { strings } = useLanguage();
  const videoRef = useRef(null);
  const framesRef = useRef([]);
  const vocalizingFlagsRef = useRef([]);
  const objectUrlRef = useRef(null);
  const finishedRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timeDomainBufferRef = useRef(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'analyzing' | 'done' | 'error'
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      resetVisionSession();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  function finalize() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    getVisionDetector().stop();
    const summary = summarizeFrames(framesRef.current);
    const vocalization = summarizeVocalization(vocalizingFlagsRef.current);
    setResult({
      summary,
      interpretation: interpretSummary(summary),
      vocalization,
      vocalizationInterpretation: interpretVocalization(vocalization),
    });
    setStatus('done');
  }

  function handleFrame(signals) {
    framesRef.current.push(signals);

    if (analyserRef.current && timeDomainBufferRef.current) {
      analyserRef.current.getFloatTimeDomainData(timeDomainBufferRef.current);
      const rms = computeRms(timeDomainBufferRef.current);
      vocalizingFlagsRef.current.push(isVocalizing(rms));
    }

    if (videoRef.current && videoRef.current.currentTime >= MAX_CLIP_SECONDS) {
      finalize();
    }
  }

  // Web Audio's MediaElementSourceNode can only ever be created once per
  // <video> element (throws InvalidStateError on a second call) — so the
  // audio graph is built once, lazily, on the first clip, and reused for
  // every subsequent clip picked in the same visit to this page.
  function ensureAudioGraph(video) {
    if (audioContextRef.current) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaElementSource(video);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    // Also connect to destination so the video's audio is audible during playback
    source.connect(audioContext.destination);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    timeDomainBufferRef.current = new Float32Array(analyser.fftSize);
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    framesRef.current = [];
    vocalizingFlagsRef.current = [];
    finishedRef.current = false;
    setResult(null);
    setStatus('analyzing');

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    const video = videoRef.current;
    video.src = url;
    video.muted = false; // keep audio unmuted so playback has sound
    video.onended = finalize;

    try {
      ensureAudioGraph(video);
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      await getVisionDetector().startFromFile(video, handleFrame);
    } catch {
      setStatus('error');
    }
  }

  function handleReset() {
    setStatus('idle');
    setResult(null);
    framesRef.current = [];
    vocalizingFlagsRef.current = [];
  }

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">{strings.videoCheck?.eyebrow || 'Standalone check'}</p>
        <h1>{strings.videoCheck?.title || 'Quick video check'}</h1>
        <p className="subtitle">
          {(strings.videoCheck?.subtitle || 'Pick or record up to {seconds} seconds of your child at play. Analysed entirely on this device — the clip is never uploaded or saved.').replace('{seconds}', MAX_CLIP_SECONDS)}
        </p>
      </div>

      <div className="callout plain">
        <p>{strings.videoCheck?.disclaimer}</p>
      </div>

      {status === 'idle' && (
        <div className="actions">
          <label className="btn btn-primary" style={{ textAlign: 'center' }}>
            {strings.videoCheck?.chooseButton || '🎥 Choose or record a video'}
            <input
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      {status === 'analyzing' && (
        <p className="notice">{strings.videoCheck?.analyzing || 'Analysing clip on-device…'}</p>
      )}

      {status === 'error' && (
        <p className="notice">{strings.videoCheck?.errorLabel || "Couldn't analyse this clip. Try a different file."}</p>
      )}

      {/* Show during analysis and keep visible after so parents can replay with audio */}
      <video
        ref={videoRef}
        playsInline
        controls
        style={{ display: (status === 'analyzing' || status === 'done') ? 'block' : 'none', width: '100%', borderRadius: 12, marginTop: 8 }}
      />

      {status === 'done' && result && (
        <div className="section card">
          <h2 style={{ marginTop: 0 }}>{strings.videoCheck?.resultTitle || 'Result'}</h2>
          <p>{result.interpretation.message}</p>
          <p className="matrix-caption" style={{ margin: '10px 0 0' }}>
            {(strings.videoCheck?.statsLine || 'Face detected in {face}% of frames, oriented toward the camera in {gaze}%, smiling in {smile}%, {handEvents} hand-motion events detected.')
              .replace('{face}', (result.summary.faceDetectedRatio * 100).toFixed(0))
              .replace('{gaze}', (result.summary.gazeToCameraRatio * 100).toFixed(0))
              .replace('{smile}', (result.summary.smileRatio * 100).toFixed(0))
              .replace('{handEvents}', result.summary.handMotionEvents)}
          </p>
          <p style={{ margin: '14px 0 0' }}>{result.vocalizationInterpretation.message}</p>
        </div>
      )}

      <div className="actions inline" style={{ marginTop: 16 }}>
        {status === 'done' && (
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {strings.videoCheck?.checkAnother || 'Check another clip'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          {strings.videoCheck?.backHome || 'Back to home'}
        </button>
      </div>
    </main>
  );
}
