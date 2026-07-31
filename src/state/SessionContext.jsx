import { createContext, useContext, useReducer } from 'react';
import { createSession, createActivityRun, createTrial, createObservation } from '../core/model/index.js';

const SessionStateContext = createContext(null);
const SessionDispatchContext = createContext(null);

function sessionReducer(state, action) {
  switch (action.type) {
    case 'START_SESSION':
      return { session: createSession({ childId: action.childId }), activityRun: null };

    case 'LOAD_DEMO_SESSION':
      return { session: action.session, activityRun: null };

    case 'START_ACTIVITY_RUN':
      return { ...state, activityRun: createActivityRun({ activityId: action.activityId }) };

    case 'RECORD_TRIAL': {
      const trial = {
        ...createTrial({ index: action.index, serveAt: action.serveAt }),
        returnAt: action.returnAt,
        returnSource: action.returnSource,
        latencyMs: action.latencyMs,
        responded: action.responded,
      };
      return {
        ...state,
        activityRun: { ...state.activityRun, trials: [...state.activityRun.trials, trial] },
      };
    }

    case 'ADD_OBSERVATION': {
      const observation = createObservation({ code: action.code, source: action.source });
      return {
        ...state,
        activityRun: { ...state.activityRun, observations: [...state.activityRun.observations, observation] },
      };
    }

    case 'COMPLETE_ACTIVITY_RUN':
      return {
        ...state,
        session: { ...state.session, activityRuns: [...state.session.activityRuns, state.activityRun] },
        activityRun: null,
      };

    default:
      throw new Error(`Unknown session action type: ${action.type}`);
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, { session: null, activityRun: null });
  return (
    <SessionStateContext.Provider value={state}>
      <SessionDispatchContext.Provider value={dispatch}>{children}</SessionDispatchContext.Provider>
    </SessionStateContext.Provider>
  );
}

export function useSessionState() {
  const ctx = useContext(SessionStateContext);
  if (!ctx) throw new Error('useSessionState must be used within a SessionProvider');
  return ctx;
}

export function useSessionDispatch() {
  const ctx = useContext(SessionDispatchContext);
  if (!ctx) throw new Error('useSessionDispatch must be used within a SessionProvider');
  return ctx;
}
