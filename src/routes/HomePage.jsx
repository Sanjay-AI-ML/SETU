import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile, getActiveSession, clearActiveSession } from '../core/storage/index.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import { createDemoSession } from '../core/demo/index.js';
import strings from '../i18n/en.json';
import scenariosData from '../data/scenarios.json';
import activities from '../data/activities.json';

// ─── Play-Based Activities description list ───────────────────────────────────
const ACTIVITIES_EXPLANATION = [
  {
    id: 'bubble-time',
    icon: '🫧',
    name: 'Bubble Time',
    category: 'Requesting & Obtaining',
    desc: 'Parent blows bubbles, then holds the wand closed and waits. Measures how the child asks for "more" — through eye contact, reaching, pointing, or vocalizing.',
  },
  {
    id: 'peek-a-boo',
    icon: '🙈',
    name: 'Peek-a-boo',
    category: 'Social Reciprocity',
    desc: 'Parent plays peek-a-boo, then pauses mid-reveal behind hands. Measures social anticipation, smiling, facial gaze, and turn-taking.',
  },
  {
    id: 'not-this-one',
    icon: '🛑',
    name: 'Not-This-One',
    category: 'Refusal & Protest',
    desc: 'Parent offers a non-preferred item. Measures communicative refusal — turning head away, pushing item, or vocalizing "no".',
  },
  {
    id: 'whats-in-the-box',
    icon: '📦',
    name: 'What\'s In The Box?',
    category: 'Information & Commenting',
    desc: 'Parent pulls a mystery toy from a box and asks "What\'s this?". Measures pointing, labeling, showing, and sharing interest.',
  },
  {
    id: 'call-and-response',
    icon: '🗣️',
    name: 'Call & Response',
    category: 'Social Attention',
    desc: 'Parent calls child\'s name without visual cues. Measures orienting, turning toward caller, vocalizing in response, and approach.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const [childId, setChildId] = useState(null);
  const [activeSession, setActiveSessionState] = useState(null);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [activeTab, setActiveTab] = useState('play'); // 'play' | 'routines'
  const [expandedScenario, setExpandedScenario] = useState(null);

  useEffect(() => {
    getChildProfile().then((profile) => setChildId(profile?.id ?? null));
    getActiveSession().then((saved) => {
      if (saved && (saved.activityRuns?.length > 0 || saved.id)) {
        setActiveSessionState(saved);
      } else {
        setActiveSessionState(null);
      }
    });
  }, []);

  function handleStartSession() {
    clearActiveSession();
    dispatch({ type: 'START_SESSION', childId });
    navigate('/session/overview');
  }

  function handleResumeSession() {
    if (activeSession) {
      dispatch({ type: 'LOAD_DEMO_SESSION', session: activeSession });
      navigate('/session/overview');
    }
  }

  function handleTryDemo() {
    const demoSession = createDemoSession({ childId });
    dispatch({ type: 'LOAD_DEMO_SESSION', session: demoSession });
    navigate('/session/results');
  }

  const completedActivitiesCount = activeSession?.activityRuns?.length || 0;

  return (
    <main className="screen-wide">
      {/* Hero Banner Illustration */}
      <div className="home-hero-card card">
        <img src="/hero.jpg" alt="SETU Parent & Child Assessment" className="home-hero-img" />
        <div className="home-hero-content">
          <span className="hero-pill-tag">Pediatric Communication Screening</span>
          <h1>{strings.home.title}</h1>
          <p className="subtitle">{strings.home.subtitle}</p>
        </div>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────── */}
      <div className="home-tab-bar">
        <button
          type="button"
          className={`home-tab ${activeTab === 'play' ? 'active' : ''}`}
          onClick={() => setActiveTab('play')}
        >
          🎮 Play Activities
        </button>
        <button
          type="button"
          className={`home-tab ${activeTab === 'routines' ? 'active' : ''}`}
          onClick={() => setActiveTab('routines')}
        >
          🏠 Daily Routines
        </button>
      </div>

      {/* ── Play-Based Activities Card ─────────────────────────────────── */}
      {activeTab === 'play' && (
        <div className="section card demo-preview-card">
          <div className="preview-head">
            <img src="/activity.jpg" alt="Play activities" className="preview-thumb" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750 }}>
                Play-Based Assessment Activities
              </h3>
              <p className="preview-sub">
                {ACTIVITIES_EXPLANATION.length} guided 2-minute games designed to capture natural communication intent.
              </p>
            </div>
          </div>

          <div className="activity-accordion-list">
            {ACTIVITIES_EXPLANATION.map((item) => {
              const isExpanded = expandedActivity === item.id;
              return (
                <div key={item.id} className={`accordion-item ${isExpanded ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="accordion-header-btn"
                    onClick={() => setExpandedActivity(isExpanded ? null : item.id)}
                  >
                    <span className="activity-icon">{item.icon}</span>
                    <div className="activity-info">
                      <span className="activity-title">{item.name}</span>
                      <span className="activity-cat">{item.category}</span>
                    </div>
                    <span className="accordion-chevron">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="accordion-body">
                      <p>{item.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Daily Home Routines Tab ────────────────────────────────────── */}
      {activeTab === 'routines' && (
        <div className="section routines-panel">
          <div className="routines-intro">
            <p className="routines-intro-text">
              <strong>Routines-Based Intervention (RBI)</strong> embeds communication practice into
              everyday family moments — meals, bath time, dressing, and bedtime. These routines
              happen naturally every day, making them the most powerful context for real progress.
            </p>
          </div>

          <div className="scenario-list">
            {scenariosData.map((scenario) => {
              const isExpanded = expandedScenario === scenario.id;
              return (
                <div
                  key={scenario.id}
                  className={`scenario-card ${isExpanded ? 'expanded' : ''}`}
                  style={{
                    '--scenario-color': scenario.colour,
                    '--scenario-soft': scenario.colourSoft,
                  }}
                >
                  <button
                    type="button"
                    className="scenario-header-btn"
                    onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="scenario-icon">{scenario.icon}</span>
                    <div className="scenario-head-text">
                      <span className="scenario-name">{scenario.name}</span>
                      <span className="scenario-sub">{scenario.subtitle}</span>
                    </div>
                    <div className="scenario-meta-right">
                      <span className="scenario-badge">{scenario.ageRange}</span>
                      <span className="scenario-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="scenario-body">
                      <p className="scenario-desc">{scenario.description}</p>

                      <div className="scenario-details-row">
                        <div className="scenario-detail">
                          <span className="scenario-detail-label">📍 Setting</span>
                          <span className="scenario-detail-val">{scenario.setting}</span>
                        </div>
                        <div className="scenario-detail">
                          <span className="scenario-detail-label">⏰ When</span>
                          <span className="scenario-detail-val">{scenario.when}</span>
                        </div>
                      </div>

                      <div className="scenario-skills">
                        <p className="scenario-skills-title">🎯 Target Skills</p>
                        <div className="scenario-skill-tags">
                          {scenario.targetSkills.map((skill) => (
                            <span key={skill} className="skill-tag">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="scenario-setup">
                        <p className="scenario-skills-title">⚙️ Quick Setup</p>
                        <ol className="scenario-setup-list">
                          {scenario.setup.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="scenario-opportunities">
                        <p className="scenario-skills-title">
                          💡 {scenario.opportunitiesCount} Communication Opportunities
                        </p>
                        {scenario.opportunities.map((opp) => (
                          <div key={opp.id} className="opportunity-row">
                            <span className="opp-dot" />
                            <div>
                              <span className="opp-label">{opp.label}</span>
                              <p className="opp-prompt">{opp.prompt}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Action Buttons ────────────────────────────────────────── */}
      <div className="actions" style={{ gap: 12, marginTop: 16 }}>
        {/* Resume Session Button (shows progress badge when session active) */}
        {activeSession && (
          <button
            type="button"
            className="btn btn-primary btn-pulse"
            onClick={handleResumeSession}
            style={{ background: 'var(--accent)', color: '#fff', fontSize: '1.05rem', padding: '16px' }}
          >
            ▶️ Resume session ({completedActivitiesCount}/{activities.length} completed)
          </button>
        )}

        {/* Start New Session */}
        <button
          type="button"
          className={activeSession ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={handleStartSession}
          disabled={!childId}
        >
          ✨ {strings.home.startSession}
        </button>

        {/* Try Instant Demo */}
        <button type="button" className="btn btn-secondary" onClick={handleTryDemo}>
          ⚡ {strings.home.tryDemo}
        </button>
      </div>

      <div className="callout plain" style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--ink-soft)' }}>
          SETU maps natural play observations to Charity Rowland's <strong>Communication Matrix</strong> framework (OHSU).
        </p>
      </div>
    </main>
  );
}
