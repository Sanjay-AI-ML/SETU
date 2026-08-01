import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile, clearChildProfile, clearActiveSession, clearAllData, getSessions } from '../core/storage/index.js';
import ShareButton from '../components/common/ShareButton.jsx';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    getChildProfile().then(setProfile);
    getSessions().then((sessions) => setSessionCount(sessions.length));
  }, []);

  async function handleLogOut() {
    await clearChildProfile();
    await clearActiveSession();
    navigate('/child-profile', { replace: true });
  }

  async function handleResetAll() {
    await clearAllData();
    setShowConfirmModal(false);
    navigate('/consent', { replace: true });
  }

  async function handleExportBackup() {
    const sessions = await getSessions();
    const exportObject = {
      profile,
      sessions,
      exportedAt: new Date().toISOString(),
      appVersion: '0.1.0-hackathon',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SETU_Clinical_Backup_${profile?.displayName || 'Child'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <main className="screen-wide">
      <div className="screen-head">
        <p className="eyebrow">Settings & Account</p>
        <h1>Profile & Preferences</h1>
        <p className="subtitle">Manage child profile, export clinical assessment logs, or log out.</p>
      </div>

      {/* Profile Card */}
      <div className="section card settings-card">
        <div className="settings-profile-head">
          <div className="avatar-large">
            {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : '👤'}
          </div>
          <div className="profile-details">
            <h2>{profile?.displayName || 'Child Profile'}</h2>
            <p className="profile-meta">
              {profile?.ageMonths ? `${profile.ageMonths} months old` : 'Age not specified'}
              {profile?.homeLanguages ? ` • ${profile.homeLanguages}` : ''}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/child-profile')}>
            Edit
          </button>
        </div>

        {profile?.notes && (
          <div className="profile-notes">
            <span className="notes-label">Notes:</span>
            <p>{profile.notes}</p>
          </div>
        )}
      </div>

      {/* Clinical Backup & Share Section */}
      <div className="section card">
        <h3>Clinical Data & Sharing</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: '4px 0 16px' }}>
          Total saved assessment runs: <strong>{sessionCount} sessions</strong>
        </p>

        <div className="actions inline">
          <button type="button" className="btn btn-secondary" onClick={handleExportBackup}>
            📥 Backup JSON Data
          </button>
          <ShareButton
            title="SETU Assessment Data"
            text={`SETU Communication Screening summary for ${profile?.displayName || 'Child'}.`}
          />
        </div>
      </div>

      {/* Account & Logout Actions */}
      <div className="section card warning-card">
        <h3>Account & Reset Actions</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '4px 0 16px' }}>
          Logging out clears active child initials and returns to the initial profile entry.
        </p>

        <div className="actions inline">
          <button type="button" className="btn btn-secondary" onClick={handleLogOut}>
            🚪 Log Out (Switch Child)
          </button>
          <button type="button" className="btn btn-danger-outline" onClick={() => setShowConfirmModal(true)}>
            🗑️ Clear All App Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Are you sure?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
              This will permanently delete all {sessionCount} saved history sessions and child profile data on this device.
            </p>
            <div className="actions inline" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" style={{ background: 'var(--concern)', color: '#fff' }} onClick={handleResetAll}>
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer info */}
      <div className="callout plain" style={{ marginTop: 24 }}>
        <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--ink-soft)' }}>
          <strong>SETU v0.1.0 Hackathon Prototype</strong> — 100% on-device local storage. No patient healthcare information (PHI) is uploaded to remote cloud servers without authorization.
        </p>
      </div>
    </main>
  );
}
