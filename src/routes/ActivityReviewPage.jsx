import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useSessionDispatch();
  const { session, activityRun } = useSessionState();
  const visionSuggestedCodes = location.state?.visionSuggestedCodes ?? [];
  const [checked, setChecked] = useState(() => {
    const initial = {};
    visionSuggestedCodes.forEach((code) => {
      initial[code] = true;
    });
    return initial;
  });
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
  const visionSuggestedSet = new Set(visionSuggestedCodes);

  function toggle(code) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function handleConfirm() {
    submittedRef.current = true;
    for (const option of tagOptions) {
      if (checked[option.code]) {
        const source = visionSuggestedSet.has(option.code) ? 'vision-confirmed' : 'parent';
        dispatch({ type: 'ADD_OBSERVATION', code: option.code, source });
      }
    }
    dispatch({ type: 'COMPLETE_ACTIVITY_RUN' });

    const completedCount = session.activityRuns.length + 1;
    const moreActivitiesRemain = completedCount < activities.length;
    navigate(moreActivitiesRemain ? '/session/overview' : '/session/results');
  }

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">Activity complete</p>
        <h1>{strings.activityReview.title}</h1>
        <p className="subtitle">{strings.activityReview.instructions}</p>
      </div>
      <ul className="card-list">
        {tagOptions.map((option) => (
          <li key={option.code} className="check-card">
            <label>
              <input
                type="checkbox"
                checked={!!checked[option.code]}
                onChange={() => toggle(option.code)}
              />
              {option.label}
            </label>
            {visionSuggestedSet.has(option.code) && (
              <span className="chip">{strings.activityReview.visionSuggestedLabel}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="actions">
        <button className="btn btn-primary" onClick={handleConfirm}>{strings.activityReview.confirmButton}</button>
      </div>
    </main>
  );
}
