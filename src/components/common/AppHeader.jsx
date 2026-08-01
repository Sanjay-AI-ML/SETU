import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getChildProfile } from '../../core/storage/index.js';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getChildProfile().then(setProfile);
  }, [location.pathname]);

  // Don't show header on consent screen
  if (location.pathname === '/consent') {
    return null;
  }

  const childInitial = profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : '👤';

  return (
    <header className="app-nav-header">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M2 24c4-8 8-12 14-12s10 4 14 12" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 24V16M26 24V16" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 24h28" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <span className="brand-name">SETU</span>
        </div>

        <nav className="nav-links">
          <button
            type="button"
            className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
            title="Home"
          >
            🏠 Home
          </button>

          <button
            type="button"
            className={`nav-btn ${location.pathname === '/session/history' ? 'active' : ''}`}
            onClick={() => navigate('/session/history')}
            title="History"
          >
            📜 History
          </button>

          <button
            type="button"
            className={`nav-profile-btn ${location.pathname === '/settings' ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
            title="Settings & Profile"
          >
            <span className="profile-avatar">{childInitial}</span>
            <span className="profile-label">Account</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
