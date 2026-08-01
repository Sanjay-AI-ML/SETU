import { useNavigate } from 'react-router-dom';
import { setConsent } from '../core/storage/index.js';
import strings from '../i18n/en.json';

export default function ConsentPage() {
  const navigate = useNavigate();

  async function handleAcknowledge() {
    await setConsent(true);
    navigate('/', { replace: true });
  }

  return (
    <main>
      <div className="screen-head">
        <div className="brand">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M2 24c4-8 8-12 14-12s10 4 14 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 24V16M26 24V16" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 24h28" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span>SETU</span>
        </div>
        <h1>{strings.consent.title}</h1>
      </div>
      <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="callout">
          <p>{strings.consent.notDiagnostic}</p>
        </div>
        <div className="callout plain">
          <p>{strings.consent.demoDataNotice}</p>
        </div>
        <div className="callout plain">
          <p>{strings.consent.clinicianReviewNotice}</p>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={handleAcknowledge}>{strings.consent.acknowledgeButton}</button>
      </div>
    </main>
  );
}
