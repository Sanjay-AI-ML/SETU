import { useNavigate } from 'react-router-dom';
import { setConsent } from '../core/storage/index.js';
import { useLanguage } from '../i18n/index.jsx';

export default function ConsentPage() {
  const navigate = useNavigate();
  const { strings } = useLanguage();

  async function handleAcknowledge() {
    await setConsent(true);
    navigate('/', { replace: true });
  }

  return (
    <main style={{ justifyContent: 'center', minHeight: '100vh' }}>

      {/* Brand lockup */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72, height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
          border: '2px solid var(--accent-line)',
          boxShadow: '0 4px 20px var(--accent-glow)',
          marginBottom: 16,
        }}>
          <svg viewBox="0 0 32 32" fill="none" width="38" height="38" aria-hidden="true">
            <path d="M2 24c4-8 8-12 14-12s10 4 14 12" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 24V16M26 24V16" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 24h28" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.05rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'var(--accent-ink)',
          marginBottom: 6,
        }}>SETU</div>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: 0 }}>
          Parent-mediated communication screening
        </p>
      </div>

      {/* Screen head */}
      <div className="screen-head" style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.55rem' }}>{strings.consent.title}</h1>
      </div>

      {/* Consent notices */}
      <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{
          display: 'flex',
          gap: 14,
          padding: '16px 18px',
          background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
          border: '1.5px solid var(--accent-line)',
          borderRadius: 'var(--radius)',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 1 }}>🛡️</span>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--ink)', fontWeight: 550 }}>
            {strings.consent.notDiagnostic}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 14,
          padding: '16px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 1 }}>🔬</span>
          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--ink-soft)' }}>
            {strings.consent.demoDataNotice}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 14,
          padding: '16px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 1 }}>🩺</span>
          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--ink-soft)' }}>
            {strings.consent.clinicianReviewNotice}
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={handleAcknowledge} style={{ padding: '17px 24px', fontSize: '1rem' }}>
          {strings.consent.acknowledgeButton}
        </button>
      </div>
    </main>
  );
}
