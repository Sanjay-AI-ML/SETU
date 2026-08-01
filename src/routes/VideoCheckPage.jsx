// A standalone screening entry point: parent picks or records a short clip
// (up to ~30s) from the gallery/camera, and it's analysed entirely on-device
// with the same MediaPipe pipeline the guided activities use — the file
// itself never leaves the device and is never uploaded or persisted.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisionDetector, resetVisionSession } from '../core/vision/visionSession.js';
import { summarizeFrames, interpretSummary } from '../core/vision/videoScreening.js';

const MAX_CLIP_SECONDS = 30;

export default function VideoCheckPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const framesRef = useRef([]);
  const objectUrlRef = useRef(null);
  const finishedRef = useRef(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'analyzing' | 'done' | 'error'
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => {
      resetVisionSession();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function finalize() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    getVisionDetector().stop();
    const summary = summarizeFrames(framesRef.current);
    setResult({ summary, interpretation: interpretSummary(summary) });
    setStatus('done');
  }

  function handleFrame(signals) {
    framesRef.current.push(signals);
    if (videoRef.current && videoRef.current.currentTime >= MAX_CLIP_SECONDS) {
      finalize();
    }
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    framesRef.current = [];
    finishedRef.current = false;
    setResult(null);
    setStatus('analyzing');

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    const video = videoRef.current;
    video.src = url;
    video.muted = true;
    video.onended = finalize;

    try {
      await getVisionDetector().startFromFile(video, handleFrame);
    } catch {
      setStatus('error');
    }
  }

  function handleReset() {
    setStatus('idle');
    setResult(null);
    framesRef.current = [];
  }

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">Standalone check</p>
        <h1>Quick video check</h1>
        <p className="subtitle">
          Pick or record up to {MAX_CLIP_SECONDS} seconds of your child at play. Analysed
          entirely on this device — the clip is never uploaded or saved.
        </p>
      </div>

      <div className="callout plain">
        <p>
          This is an informal, on-device signal only — not a diagnosis, and not a substitute
          for the guided activities. It looks at whether a face was visible and how often your
          child oriented toward the camera during the clip.
        </p>
      </div>

      {status === 'idle' && (
        <div className="actions">
          <label className="btn btn-primary" style={{ textAlign: 'center' }}>
            🎥 Choose or record a video
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
        <p className="notice">Analysing clip on-device…</p>
      )}

      {status === 'error' && (
        <p className="notice">Couldn't analyse this clip. Try a different file.</p>
      )}

      <video ref={videoRef} playsInline style={{ display: status === 'analyzing' ? 'block' : 'none', width: '100%', borderRadius: 12 }} />

      {status === 'done' && result && (
        <div className="section card">
          <h2 style={{ marginTop: 0 }}>Result</h2>
          <p>{result.interpretation.message}</p>
          <p className="matrix-caption" style={{ margin: '10px 0 0' }}>
            Face detected in {(result.summary.faceDetectedRatio * 100).toFixed(0)}% of frames,
            oriented toward the camera in {(result.summary.gazeToCameraRatio * 100).toFixed(0)}%,
            smiling in {(result.summary.smileRatio * 100).toFixed(0)}%,
            {' '}{result.summary.handMotionEvents} hand-motion events detected.
          </p>
        </div>
      )}

      <div className="actions inline" style={{ marginTop: 16 }}>
        {status === 'done' && (
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Check another clip
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </main>
  );
}
