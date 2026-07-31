import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');
const tagOptions = bubbleTime.expectedBehaviours.map((code, index) => ({
  code,
  label: bubbleTime.reviewTags[index],
}));

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const [checked, setChecked] = useState({});

  function toggle(code) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function handleConfirm() {
    for (const option of tagOptions) {
      if (checked[option.code]) {
        dispatch({ type: 'ADD_OBSERVATION', code: option.code, source: 'parent' });
      }
    }
    dispatch({ type: 'COMPLETE_ACTIVITY_RUN' });
    navigate('/session/results');
  }

  return (
    <main>
      <h1>{strings.activityReview.title}</h1>
      <p>{strings.activityReview.instructions}</p>
      {tagOptions.map((option) => (
        <label key={option.code}>
          <input
            type="checkbox"
            checked={!!checked[option.code]}
            onChange={() => toggle(option.code)}
          />
          {option.label}
        </label>
      ))}
      <button onClick={handleConfirm}>{strings.activityReview.confirmButton}</button>
    </main>
  );
}
