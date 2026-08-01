import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile, clearChildProfile, clearActiveSession, clearAllData, getSessions } from '../core/storage/index.js';
import { useLanguage } from '../i18n/index.jsx';
import ShareButton from '../components/common/ShareButton.jsx';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { strings } = useLanguage();
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
        <p className="eyebrow">{strings.settings?.eyebrow || 'Settings & Account'}</p>
        <h1>{strings.settings?.title || 'Profile & Preferences'}</h1>
        <p className="subtitle">{strings.settings?.subtitle || 'Manage child profile, export clinical assessment logs, or log out.'}</p>
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
              {profile?.ageMonths ? `${profile.ageMonths} months old` : ''}
              {profile?.homeLanguages ? ` • ${profile.homeLanguages}` : ''}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/child-profile')}>
            ✏️ {strings.settings?.edit || 'Edit'}
          </button>
        </div>

        {profile?.notes && (
          <div className="profile-notes">
            <span className="notes-label">{strings.settings?.notes || 'Notes:'}</span>
            <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{profile.notes}</p>
          </div>
        )}
      </div>

      {/* Clinical Backup & Share Section */}
      <div className="section card">
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 750 }}>
          📊 {strings.settings?.backupTitle || 'Clinical Data & Sharing'}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0 0 16px' }}>
          {(strings.settings?.savedRuns || 'Total saved assessment runs: {count} sessions').replace('{count}', sessionCount)}
        </p>

        <div className="actions inline" style={{ gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportBackup}>
            📥 {strings.settings?.backupData || 'Backup JSON Data'}
          </button>
          <ShareButton
            title="SETU Assessment Data"
            text={`SETU Communication Screening summary for ${profile?.displayName || 'Child'}.`}
          />
        </div>
      </div>

      {/* Account & Reset Actions */}
      <div className="section card warning-card">
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 750, color: 'var(--concern)' }}>
          ⚙️ {strings.settings?.accountTitle || 'Account & Reset Actions'}
        </h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--ink-soft)', margin: '0 0 16px' }}>
          {strings.settings?.accountSub || 'Logging out clears active child profile and returns to initial setup.'}
        </p>

        <div className="actions inline" style={{ gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={handleLogOut}>
            🚪 {strings.settings?.logout || 'Log Out (Switch Child)'}
          </button>
          <button type="button" className="btn btn-danger-outline" onClick={() => setShowConfirmModal(true)}>
            🗑️ {strings.settings?.clearAll || 'Clear All App Data'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>
              ⚠️ {strings.settings?.confirmTitle || 'Are you sure?'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 20px' }}>
              {(strings.settings?.confirmSub || 'This will permanently delete all {count} saved history sessions and child profile data on this device.').replace('{count}', sessionCount)}
            </p>
            <div className="actions inline" style={{ gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)} style={{ flex: 1 }}>
                {strings.settings?.cancel || 'Cancel'}
              </button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--concern)', borderColor: 'var(--concern)', flex: 1 }} onClick={handleResetAll}>
                {strings.settings?.deleteEverything || 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experimental Features */}
      <div className="section card special-feature-card">
        <span className="chip" style={{ marginBottom: 8 }}>🧪 {strings.settings?.experimentalTitle || 'Experimental'}</span>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 750 }}>
          {strings.settings?.experimentalTitle || 'Experimental'}
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--ink-soft)', margin: '0 0 14px', lineHeight: 1.5 }}>
          {strings.settings?.experimentalSubtitle || 'Novelty features under active exploration. Not validated, not part of any assessment or report.'}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/voice-age-check')}>
          🎙️ {strings.settings?.voiceRegisterCheck || 'Voice register check'}
        </button>
      </div>

      {/* Disclaimer info */}
      <div className="callout plain" style={{ marginTop: 20 }}>
        <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
          {strings.settings?.disclaimer || 'SETU v0.1.0 Hackathon Prototype — 100% on-device local storage. No patient healthcare information (PHI) is uploaded to remote cloud servers.'}
        </p>
      </div>
    </main>
  );
}
