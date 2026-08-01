import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getChildProfile } from '../../core/storage/index.js';
import { useLanguage } from '../../i18n/index.jsx';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const { lang, setLanguage, strings } = useLanguage();

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
          <select
            className="nav-btn"
            value={lang}
            onChange={(e) => setLanguage(e.target.value)}
            title="Language"
            style={{ padding: '4px 6px', cursor: 'pointer', background: 'var(--surface-sunk)', border: '1px solid var(--border)' }}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>

          <button
            type="button"
            className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
            title={strings.header?.home || 'Home'}
          >
            🏠 {strings.header?.home || 'Home'}
          </button>

          <button
            type="button"
            className={`nav-btn ${location.pathname === '/session/history' ? 'active' : ''}`}
            onClick={() => navigate('/session/history')}
            title={strings.header?.history || 'History'}
          >
            📜 {strings.header?.history || 'History'}
          </button>

          <button
            type="button"
            className={`nav-profile-btn ${location.pathname === '/settings' ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
            title={strings.header?.account || 'Account'}
          >
            <span className="profile-avatar">{childInitial}</span>
            <span className="profile-label">{strings.header?.account || 'Account'}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
