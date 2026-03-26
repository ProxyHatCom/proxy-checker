import { useEffect } from 'react';
import styles from './BulkPasteModal.module.css';
import settingsStyles from './SettingsModal.module.css';

interface Settings {
  defaultThreads: number;
  connectionTimeout: number;
  requestTimeout: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (s: Settings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Settings, value: string | number) => {
    onSave({ ...settings, [key]: value });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Settings</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className={styles.body}>
          <div className={settingsStyles.group}>
            <label>Default Threads</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.defaultThreads}
              onChange={e => handleChange('defaultThreads', Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
            />
          </div>
          <div className={settingsStyles.row}>
            <div className={settingsStyles.group}>
              <label>Connection Timeout (s)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.connectionTimeout}
                onChange={e => handleChange('connectionTimeout', Math.min(60, Math.max(1, parseInt(e.target.value) || 5)))}
              />
            </div>
            <div className={settingsStyles.group}>
              <label>Request Timeout (s)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.requestTimeout}
                onChange={e => handleChange('requestTimeout', Math.min(60, Math.max(1, parseInt(e.target.value) || 10)))}
              />
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export type { Settings };
