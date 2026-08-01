import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChildProfile } from '../core/model/index.js';
import { setChildProfile } from '../core/storage/index.js';
import { useLanguage } from '../i18n/index.jsx';

const AVAILABLE_LANGUAGES = ['English', 'Tamil', 'Hindi'];

export default function ChildProfilePage() {
  const navigate = useNavigate();
  const { strings } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [homeLanguages, setHomeLanguages] = useState([]);
  const [notes, setNotes] = useState('');

  function toggleLanguage(language) {
    setHomeLanguages((current) =>
      current.includes(language) ? current.filter((l) => l !== language) : [...current, language]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const profile = createChildProfile({
      displayName,
      ageMonths: Number(ageMonths),
      homeLanguages,
      notes,
    });
    await setChildProfile(profile);
    navigate('/', { replace: true });
  }

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">Child profile</p>
        <h1>{strings.childProfile.title}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="displayName">{strings.childProfile.displayNameLabel}</label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ageMonths">{strings.childProfile.ageMonthsLabel}</label>
          <input
            id="ageMonths"
            type="number"
            min="0"
            required
            value={ageMonths}
            onChange={(event) => setAgeMonths(event.target.value)}
          />
        </div>
        <fieldset>
          <legend>{strings.childProfile.homeLanguagesLabel}</legend>
          {AVAILABLE_LANGUAGES.map((language) => (
            <label key={language} className="option">
              <input
                type="checkbox"
                checked={homeLanguages.includes(language)}
                onChange={() => toggleLanguage(language)}
              />
              {language}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="notes">{strings.childProfile.notesLabel}</label>
          <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="actions tight">
          <button className="btn btn-primary" type="submit">{strings.childProfile.saveButton}</button>
        </div>
      </form>
    </main>
  );
}
