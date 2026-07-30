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
      <h1>{strings.consent.title}</h1>
      <p>{strings.consent.notDiagnostic}</p>
      <p>{strings.consent.demoDataNotice}</p>
      <p>{strings.consent.clinicianReviewNotice}</p>
      <button onClick={handleAcknowledge}>{strings.consent.acknowledgeButton}</button>
    </main>
  );
}
