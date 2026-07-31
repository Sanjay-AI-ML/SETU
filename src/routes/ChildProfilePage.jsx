import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChildProfile } from '../core/model/index.js';
import { setChildProfile } from '../core/storage/index.js';
import strings from '../i18n/en.json';

export default function ChildProfilePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [ageMonths, setAgeMonths] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const profile = createChildProfile({ displayName, ageMonths: Number(ageMonths) });
    await setChildProfile(profile);
    navigate('/', { replace: true });
  }

  return (
    <main>
      <h1>{strings.childProfile.title}</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="displayName">{strings.childProfile.displayNameLabel}</label>
        <input
          id="displayName"
          type="text"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <label htmlFor="ageMonths">{strings.childProfile.ageMonthsLabel}</label>
        <input
          id="ageMonths"
          type="number"
          min="0"
          required
          value={ageMonths}
          onChange={(event) => setAgeMonths(event.target.value)}
        />
        <button type="submit">{strings.childProfile.saveButton}</button>
      </form>
    </main>
  );
}
