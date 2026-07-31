import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile } from '../core/storage/index.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
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

  return (
    <main>
      <h1>{strings.home.title}</h1>
      <button onClick={handleStartSession} disabled={!childId}>
        {strings.home.startSession}
      </button>
      <button disabled>{strings.home.resumeSession}</button>
      <button disabled>{strings.home.viewHistory}</button>
    </main>
  );
}
