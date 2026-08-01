import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/index.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   EngagementNarratorPage
   Uses MediaPipe FaceLandmarker + HandLandmarker (on-device, no server)
   to generate rule-based natural-language descriptions of what the child
   is doing during parent engagement.

   IMPORTANT: Raw video frames are NEVER saved or transmitted.
   All analysis happens on-device in the browser WASM runtime.
   This is screening support only — not a clinical diagnosis.
───────────────────────────────────────────────────────────────────────── */

/* ── Rule-based description templates ──────────────────────────────────── */
const RULES_EN = {
  lookingAtParent:   "Child is looking at parent — shared attention 🧑‍🤝‍🧑",
  lookingAtCamera:   "Child is making direct eye contact with camera 👀",
  lookingAtToy:      "Child is focused down on the play object 🧸",
  lookingAway:       "Child is looking away 🔄",
  handsRaised:       "Child is raising their hand(s) in engagement ✋",
  handReaching:      "Child is reaching out toward parent 🤲",
  handsAtRest:       "Child's hands are relaxed at rest",
  mouthOpen:         "Child's mouth is open — vocalising to parent 🗣️",
  faceLost:          "Child moved out of frame — waiting to re-detect 🔍",
  faceDetected:      "Child's face detected ✅",
  engagementHigh:    "Strong parent-child engagement & shared attention! 🌟",
  engagementLow:     "Child appears distracted — try calling their name",
  parentEngaged:     "Parent-child interaction active 🧑‍🤝‍🧑",
};

const RULES_TA = {
  lookingAtParent:   "குழந்தை பெற்றாரை/அப்பாவை பார்க்கிறது — பகிர்ந்த கவனம் 🧑‍🤝‍🧑",
  lookingAtCamera:   "குழந்தை நேரடி கண் தொடர்பு கொள்கிறது 👀",
  lookingAtToy:      "குழந்தை விளையாட்டு பொருளை பார்க்கிறது 🧸",
  lookingAway:       "குழந்தை வேறு இடத்தை பார்க்கிறது 🔄",
  handsRaised:       "குழந்தை கைகளை உயர்த்துகிறது ✋",
  handReaching:      "குழந்தை பெற்றாரை நோக்கி கைகளை நீட்டுகிறது 🤲",
  handsAtRest:       "குழந்தையின் கைகள் ஓய்வில் உள்ளன",
  mouthOpen:         "குழந்தை பெற்றாரிடம் சத்தமிட்டு பேசுகிறது 🗣️",
  faceLost:          "குழந்தை திரையில் இல்லை — மீண்டும் தேடுகிறோம் 🔍",
  faceDetected:      "குழந்தையின் முகம் கண்டறியப்பட்டது ✅",
  engagementHigh:    "பெற்றோர்-குழந்தை இடையே சிறந்த ஈடுபாடு & பகிர்ந்த கவனம்! 🌟",
  engagementLow:     "குழந்தை கவனம் திசைதிரும்பியது — பெயரை அழைக்கவும்",
  parentEngaged:     "பெற்றோர்-குழந்தை தொடர்பு செயல்பாட்டில் உள்ளது 🧑‍🤝‍🧑",
};

const RULES_HI = {
  lookingAtParent:   "बच्चा माता-पिता/पिता को देख रहा है — साझा ध्यान 🧑‍🤝‍🧑",
  lookingAtCamera:   "बच्चा कैमरे से सीधा संपर्क बना रहा है 👀",
  lookingAtToy:      "बच्चा खिलौने/सामग्री को देख रहा है 🧸",
  lookingAway:       "बच्चा दूसरी ओर देख रहा है 🔄",
  handsRaised:       "बच्चा उत्सुकता से हाथ उठा रहा है ✋",
  handReaching:      "बच्चा माता-पिता/पिता की ओर हाथ बढ़ा रहा है 🤲",
  handsAtRest:       "बच्चे के हाथ आराम की स्थिति में हैं",
  mouthOpen:         "बच्चा मुँह खोलकर माता-पिता से बोल रहा है 🗣️",
  faceLost:          "बच्चा फ्रेम से बाहर हो गया — पुनः खोज रहे हैं 🔍",
  faceDetected:      "बच्चे का चेहरा पहचाना गया ✅",
  engagementHigh:    "उत्कृष्ट माता-पिता-बच्चा सहभागिता और साझा ध्यान! 🌟",
  engagementLow:     "बच्चा विचलित लगता है — नाम पुकारें",
  parentEngaged:     "माता-पिता-बच्चा संपर्क सक्रिय है 🧑‍🤝‍🧑",
};

const RULES_MAP = { en: RULES_EN, ta: RULES_TA, hi: RULES_HI };

/* ── Landmark indices (MediaPipe Face 478-pt mesh) ───────────────────── */
const LEFT_EYE_CENTER  = 468; // iris center
const RIGHT_EYE_CENTER = 473;
const NOSE_TIP         = 1;
const MOUTH_TOP        = 13;
const MOUTH_BOTTOM     = 14;
const LEFT_SHOULDER_EST  = 234; // cheek proxy (no body)
const RIGHT_SHOULDER_EST = 454;

/* ── Gaze heuristic: if iris x is close to nose x → facing camera ────── */
function computeGazeScore(landmarks) {
  if (!landmarks || landmarks.length < 478) return 0.5;
  const noseX  = landmarks[NOSE_TIP].x;
  const leftX  = landmarks[LEFT_EYE_CENTER].x;
  const rightX = landmarks[RIGHT_EYE_CENTER].x;
  const midEye = (leftX + rightX) / 2;
  const diff   = Math.abs(midEye - noseX);
  return Math.max(0, 1 - diff * 8); // 0 = looking away, 1 = full frontal
}

/* ── Mouth openness: vertical distance between lips relative to face ──── */
function computeMouthOpen(landmarks) {
  if (!landmarks || landmarks.length < 20) return false;
  const top    = landmarks[MOUTH_TOP].y;
  const bottom = landmarks[MOUTH_BOTTOM].y;
  const gap    = Math.abs(bottom - top);
  return gap > 0.025; // empirical threshold
}

/* ── Hand raise heuristic (wrist y vs shoulder-proxy y) ─────────────── */
function computeHandState(handLandmarks, faceLandmarks) {
  if (!handLandmarks || handLandmarks.length === 0) return 'rest';
  if (!faceLandmarks || faceLandmarks.length === 0) return 'detected';

  const shoulderProxyY = (faceLandmarks[LEFT_SHOULDER_EST].y + faceLandmarks[RIGHT_SHOULDER_EST].y) / 2;
  let raised = false, reaching = false;

  for (const hand of handLandmarks) {
    const wrist = hand[0];
    if (wrist.y < shoulderProxyY - 0.05) raised = true;
    const indexTip = hand[8];
    if (Math.abs(indexTip.x - 0.5) > 0.3) reaching = true;
  }
  if (raised)   return 'raised';
  if (reaching) return 'reaching';
  return 'rest';
}

/* ── Throttle helper ─────────────────────────────────────────────────── */
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

export default function EngagementNarratorPage() {
  const navigate   = useNavigate();
  const { lang }   = useLanguage();
  const rules      = RULES_MAP[lang] ?? RULES_EN;

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const flRef      = useRef(null); // FaceLandmarker
  const hlRef      = useRef(null); // HandLandmarker
  const rafRef     = useRef(null);
  const synthRef   = useRef(window.speechSynthesis);

  const [status,     setStatus]     = useState('loading');  // loading|ready|running|error
  const [transcript, setTranscript] = useState([]);
  const [current,    setCurrent]    = useState('');
  const [gazeScore,  setGazeScore]  = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [faceBox,    setFaceBox]    = useState(null);

  // ── Load MediaPipe via CDN WASM (free, on-device) ───────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        const { FaceLandmarker, HandLandmarker, FilesetResolver } =
          await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const [fl, hl] = await Promise.all([
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 4,
            minFaceDetectionConfidence: 0.15,
            minFacePresenceConfidence: 0.15,
            minTrackingConfidence: 0.15,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          }),
          HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 4,
            minHandDetectionConfidence: 0.2,
            minHandPresenceConfidence: 0.2,
            minTrackingConfidence: 0.2,
          }),
        ]);

        if (!cancelled) {
          flRef.current = fl;
          hlRef.current = hl;
          setStatus('ready');
        }
      } catch (err) {
        console.error('MediaPipe load error:', err);
        if (!cancelled) setStatus('error');
      }
    }
    loadModels();
    return () => { cancelled = true; };
  }, []);

  const objectUrlRef = useRef(null);

  // ── Start camera ─────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 480 }, height: { ideal: 360 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStatus('running');
    } catch {
      setStatus('error');
    }
  }, []);

  // ── Start from uploaded video file ───────────────────────────────────
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.loop = true;
        videoRef.current.controls = true;
        videoRef.current.muted = false;
        await videoRef.current.play();
      }
      setStatus('running');
    } catch (err) {
      console.error('File load error:', err);
      setStatus('error');
    }
  }, []);

  // ── Speak a description (non-blocking, de-duped) ────────────────────
  const lastSpokenRef = useRef('');
  const speak = useCallback((text) => {
    if (!synthRef.current || text === lastSpokenRef.current) return;
    if (synthRef.current.speaking) synthRef.current.cancel();
    lastSpokenRef.current = text;
    const utt = new SpeechSynthesisUtterance(text.replace(/[✅👀🔄✋🤲🗣️🔍🌟🧑‍🤝‍🧑]/gu, ''));
    utt.lang   = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
    utt.rate   = 0.9;
    utt.pitch  = 1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    synthRef.current.speak(utt);
  }, [lang]);

  // ── Main detection loop ──────────────────────────────────────────────
  const prevDescRef = useRef('');
  const addToTranscript = useCallback(throttle((desc) => {
    if (desc === prevDescRef.current) return;
    prevDescRef.current = desc;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscript(prev => [{ ts, desc }, ...prev].slice(0, 20));
    setCurrent(desc);
    speak(desc);
  }, 2500), [speak]);

  const lastValidFaceRef = useRef(null);
  const lastValidFaceTimeRef = useRef(0);

  useEffect(() => {
    if (status !== 'running') return;

    function detect() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || video.readyState < 2 || !flRef.current || !hlRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      const faceResult = flRef.current.detectForVideo(video, now);
      const handResult = hlRef.current.detectForVideo(video, now);

      const allFaces = faceResult?.faceLandmarks ?? [];
      const handLMs  = handResult?.landmarks ?? [];

      // ── Isolate child's face ──────────────────────────────────────────
      // In parent-child interaction, if multiple faces are present,
      // select the lower/smaller face or the face closest to the hands.
      let faceLM = null;
      if (allFaces.length > 0) {
        if (allFaces.length === 1) {
          faceLM = allFaces[0];
        } else {
          // Sort by nose y-position (lower in frame = child)
          const sorted = [...allFaces].sort((a, b) => (b[NOSE_TIP]?.y ?? 0) - (a[NOSE_TIP]?.y ?? 0));
          faceLM = sorted[0];
        }
        lastValidFaceRef.current = faceLM;
        lastValidFaceTimeRef.current = now;
      } else if (now - lastValidFaceTimeRef.current < 1500) {
        // Use last valid face position within 1.5s grace window
        faceLM = lastValidFaceRef.current;
      }

      // ── Draw canvas overlay ──────────────────────────────────────────
      if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width  = video.videoWidth  || 480;
        canvas.height = video.videoHeight || 360;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faceLM) {
          // Draw a bounding box approximation
          const xs = faceLM.map(p => p.x * canvas.width);
          const ys = faceLM.map(p => p.y * canvas.height);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const pad = 12;
          ctx.strokeStyle = 'rgba(185,111,24,0.85)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2, 12);
          ctx.stroke();
          setFaceBox({ x: minX - pad, y: minY - pad, w: (maxX - minX) + pad * 2, h: (maxY - minY) + pad * 2 });

          // Draw iris dots
          [LEFT_EYE_CENTER, RIGHT_EYE_CENTER].forEach(idx => {
            if (faceLM[idx]) {
              ctx.fillStyle = 'rgba(185,111,24,0.9)';
              ctx.beginPath();
              ctx.arc(faceLM[idx].x * canvas.width, faceLM[idx].y * canvas.height, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        } else {
          setFaceBox(null);
        }

        // Draw hand skeleton dots
        for (const hand of handLMs) {
          for (const pt of hand) {
            ctx.fillStyle = 'rgba(36,107,82,0.8)';
            ctx.beginPath();
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ── Rule-based description engine ───────────────────────────────
      let desc = '';
      if (!faceLM) {
        desc = rules.faceLost;
        setGazeScore(0);
      } else {
        const gaze      = computeGazeScore(faceLM);
        const mouthOpen = computeMouthOpen(faceLM);
        const handState = computeHandState(handLMs, faceLM);

        // Normalize engagement score: looking at parent (0.30-0.65) or camera (>0.65) counts as high attention
        const engagementScore = Math.min(1, gaze > 0.30 ? (gaze > 0.65 ? 1.0 : 0.85) : gaze * 2.5);
        setGazeScore(engagementScore);

        if (gaze >= 0.30 && handState === 'reaching') {
          desc = rules.handReaching;
        } else if (gaze >= 0.30 && handState === 'raised') {
          desc = rules.engagementHigh;
        } else if (gaze >= 0.30 && mouthOpen) {
          desc = rules.mouthOpen;
        } else if (gaze > 0.65) {
          desc = rules.lookingAtCamera;
        } else if (gaze >= 0.30) {
          desc = rules.lookingAtParent;
        } else if (handState === 'raised') {
          desc = rules.handsRaised;
        } else if (handState === 'reaching') {
          desc = rules.handReaching;
        } else if (mouthOpen) {
          desc = rules.mouthOpen;
        } else if (gaze < 0.18) {
          desc = rules.lookingAway;
        } else {
          desc = rules.lookingAtToy;
        }
      }

      addToTranscript(desc);
      rafRef.current = requestAnimationFrame(detect);
    }

    rafRef.current = requestAnimationFrame(detect);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [status, rules, addToTranscript]);

  // ── Cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (synthRef.current?.speaking) synthRef.current.cancel();
    };
  }, []);

  // ── Gaze bar colour ──────────────────────────────────────────────────
  const gazeColour = gazeScore > 0.65
    ? 'var(--mastered)'
    : gazeScore > 0.35
    ? 'var(--emerging)'
    : 'var(--concern)';

  const gazeLabel = lang === 'ta'
    ? gazeScore > 0.65 ? 'கவனம் உயர்வு' : gazeScore > 0.35 ? 'பகுதி கவனம்' : 'திசைதிரும்பியது'
    : lang === 'hi'
    ? gazeScore > 0.65 ? 'ध्यान उच्च' : gazeScore > 0.35 ? 'आंशिक ध्यान' : 'विचलित'
    : gazeScore > 0.65 ? 'High attention' : gazeScore > 0.35 ? 'Partial attention' : 'Distracted';

  return (
    <main style={{ maxWidth: 520, padding: '16px 14px 64px' }}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="screen-head">
        <div className="eyebrow">
          {lang === 'ta' ? 'AI ஈடுபாடு விவரிப்பு' : lang === 'hi' ? 'AI सहभागिता वर्णन' : 'AI Engagement Narrator'}
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>
          {lang === 'ta' ? '🎬 செயல்பாட்டை விவரிக்கவும்'
            : lang === 'hi' ? '🎬 गतिविधि का वर्णन करें'
            : '🎬 Describe the Activity'}
        </h1>
        <p className="subtitle">
          {lang === 'ta'
            ? 'கேமரா உங்கள் குழந்தையை கவனிக்கிறது. AI, குழந்தை என்ன செய்கிறது என்று சொல்லும். இது நோயறிதல் அல்ல.'
            : lang === 'hi'
            ? 'कैमरा आपके बच्चे को देख रहा है। AI बताएगा कि बच्चा क्या कर रहा है। यह निदान नहीं है।'
            : 'The camera watches your child. The AI narrates what it observes in real-time. Not a diagnosis — screening support only.'}
        </p>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <div className="notice" style={{ marginBottom: 14 }}>
        {lang === 'ta'
          ? 'வீடியோ சேமிக்கப்படவில்லை. எல்லாம் சாதனத்தில் மட்டுமே நடக்கிறது. இது மருத்துவ அல்ல.'
          : lang === 'hi'
          ? 'वीडियो कभी सेव नहीं होता। सब कुछ डिवाइस पर ही होता है। यह चिकित्सीय नहीं है।'
          : 'Video is never saved or sent anywhere. All analysis runs locally on this device. Not a medical tool.'}
      </div>

      {/* ── Camera + Overlay ─────────────────────────────────────────── */}
      <div className="narrator-camera-wrap">
        <video
          ref={videoRef}
          className="narrator-video"
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="narrator-canvas" />

        {/* Loading overlay */}
        {status === 'loading' && (
          <div className="narrator-overlay-msg">
            <div className="narrator-spinner" />
            <p>{lang === 'ta' ? 'AI மாதிரிகள் ஏற்றப்படுகின்றன…' : lang === 'hi' ? 'AI मॉडल लोड हो रहे हैं…' : 'Loading AI models…'}</p>
            <p style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: 4 }}>
              {lang === 'ta' ? '(முதல் முறை சிறிது நேரம் ஆகலாம்)' : lang === 'hi' ? '(पहली बार थोड़ा समय लग सकता है)' : '(First load may take 10–20s)'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="narrator-overlay-msg" style={{ color: 'var(--concern)' }}>
            <p>⚠️ {lang === 'ta' ? 'கேமரா அல்லது AI கிடைக்கவில்லை' : lang === 'hi' ? 'कैमरा या AI उपलब्ध नहीं' : 'Camera or AI unavailable'}</p>
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="narrator-speaking-badge">
            🔊 {lang === 'ta' ? 'பேசுகிறது…' : lang === 'hi' ? 'बोल रहा है…' : 'Speaking…'}
          </div>
        )}

        {/* Face detected badge */}
        {faceBox && status === 'running' && (
          <div className="narrator-face-badge">
            ✅ {lang === 'ta' ? 'முகம் கண்டறியப்பட்டது' : lang === 'hi' ? 'चेहरा पहचाना' : 'Face detected'}
          </div>
        )}
      </div>

      {/* ── Start Action Buttons ─────────────────────────────────────── */}
      {status === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={startCamera}>
            📷 {lang === 'ta' ? 'லைவ் கேமராவை தொடங்கு' : lang === 'hi' ? 'लाइव कैमरा शुरू करें' : 'Start Live Rear Camera'}
          </button>

          <label className="btn btn-secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
            📁 {lang === 'ta' ? 'வீடியோவை பதிவேற்று / தேர்ந்தெடு' : lang === 'hi' ? 'वीडियो अपलोड / चुनें' : 'Upload / Pick Video File'}
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      {/* ── Gaze Meter ───────────────────────────────────────────────── */}
      {status === 'running' && (
        <div className="narrator-gaze-section">
          <div className="narrator-gaze-header">
            <span className="narrator-gaze-label">
              {lang === 'ta' ? '👁️ கவன அளவு' : lang === 'hi' ? '👁️ ध्यान स्तर' : '👁️ Attention Level'}
            </span>
            <span className="narrator-gaze-value" style={{ color: gazeColour }}>{gazeLabel}</span>
          </div>
          <div className="narrator-gaze-track">
            <div
              className="narrator-gaze-fill"
              style={{ width: `${Math.round(gazeScore * 100)}%`, background: gazeColour }}
            />
          </div>
        </div>
      )}

      {/* ── Current description card ──────────────────────────────────── */}
      {current && (
        <div className="narrator-current-card">
          <div className="narrator-current-label">
            {lang === 'ta' ? '🤖 தற்போதைய விவரிப்பு' : lang === 'hi' ? '🤖 वर्तमान वर्णन' : '🤖 Current Description'}
          </div>
          <p className="narrator-current-text">{current}</p>
        </div>
      )}

      {/* ── Observation transcript ────────────────────────────────────── */}
      {transcript.length > 0 && (
        <div className="narrator-transcript">
          <div className="narrator-transcript-header">
            {lang === 'ta' ? '📋 தொடர்ச்சியான விவரிப்பு' : lang === 'hi' ? '📋 चल रहा वर्णन' : '📋 Live Transcript'}
          </div>
          <div className="narrator-log">
            {transcript.map((item, i) => (
              <div key={i} className={`narrator-log-row ${i === 0 ? 'narrator-log-row--latest' : ''}`}>
                <span className="narrator-log-ts">{item.ts}</span>
                <span className="narrator-log-desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Running actions ──────────────────────────────────────────── */}
      {status === 'running' && (
        <div className="actions tight" style={{ marginTop: 12 }}>
          <label className="btn btn-secondary" style={{ textAlign: 'center', cursor: 'pointer' }}>
            📁 {lang === 'ta' ? 'வேறொரு வீடியோவை தேர்ந்தெடு' : lang === 'hi' ? 'दूसरा वीडियो चुनें' : 'Pick Another Video File'}
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      {/* ── Back button ──────────────────────────────────────────────── */}
      <div className="actions tight">
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (synthRef.current?.speaking) synthRef.current.cancel();
            navigate('/');
          }}
        >
          ← {lang === 'ta' ? 'முகப்புக்கு திரும்பு' : lang === 'hi' ? 'होम पर वापस' : 'Back to Home'}
        </button>
      </div>
    </main>
  );
}
