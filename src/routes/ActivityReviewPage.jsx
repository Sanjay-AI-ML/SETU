import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const { session, activityRun } = useSessionState();
  const [checked, setChecked] = useState({});
  const submittedRef = useRef(false);

  if (!session || (!activityRun && !submittedRef.current)) {
    return <Navigate to="/" replace />;
  }
  if (submittedRef.current) {
    return null;
  }

  const currentActivity = activities.find((activity) => activity.id === activityRun.activityId);
  const tagOptions = currentActivity.expectedBehaviours.map((code, index) => ({
    code,
    label: currentActivity.reviewTags[index],
  }));

  function toggle(code) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function handleConfirm() {
    submittedRef.current = true;
    for (const option of tagOptions) {
      if (checked[option.code]) {
        dispatch({ type: 'ADD_OBSERVATION', code: option.code, source: 'parent' });
      }
    }
    dispatch({ type: 'COMPLETE_ACTIVITY_RUN' });

    const completedCount = session.activityRuns.length + 1;
    const moreActivitiesRemain = completedCount < activities.length;
    navigate(moreActivitiesRemain ? '/session/overview' : '/session/results');
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
