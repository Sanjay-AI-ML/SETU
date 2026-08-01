import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile } from '../core/storage/index.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import { createDemoSession } from '../core/demo/index.js';
import strings from '../i18n/en.json';

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const [childId, setChildId] = useState(null);

  useEffect(() => {
    getChildProfile().then((profile) => setChildId(profile?.id ?? null));
  }, []);

  function handleStartSession() {
    dispatch({ type: 'START_SESSION', childId });
    navigate('/session/overview');
  }

  function handleTryDemo() {
    dispatch({ type: 'LOAD_DEMO_SESSION', session: createDemoSession({ childId }) });
    navigate('/session/results');
  }

  return (
    <main>
      <div className="spacer" />
      <div className="screen-head" style={{ textAlign: 'center' }}>
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ width: 44, height: 44, margin: '0 auto 18px' }}>
          <path d="M2 24c4-8 8-12 14-12s10 4 14 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 24V16M26 24V16" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 24h28" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <h1 style={{ fontSize: '2.1rem' }}>{strings.home.title}</h1>
        <p className="subtitle" style={{ margin: '0 auto' }}>A bridge between parents and speech-language pathologists.</p>
      </div>
      <div className="spacer" />
      <div className="actions">
        <button className="btn btn-primary" onClick={handleStartSession} disabled={!childId}>
          {strings.home.startSession}
        </button>
        <button className="btn btn-secondary" onClick={handleTryDemo}>{strings.home.tryDemo}</button>
        <button className="btn btn-ghost" disabled>{strings.home.resumeSession}</button>
        <button className="btn btn-ghost" disabled>{strings.home.viewHistory}</button>
      </div>
    </main>
  );
}
