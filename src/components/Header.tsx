import { useTheme } from '../context/ThemeContext';
import styles from './Header.module.css';

interface HeaderProps {
  onSettingsClick: () => void;
  version?: string;
  updateAvailable?: { version: string; body?: string } | null;
  isUpdating?: boolean;
  onUpdate?: () => void;
}

export function Header({ onSettingsClick, version, updateAvailable, isUpdating, onUpdate }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img
          src={theme === 'dark' ? '/MainLogoWhite.png' : '/MainLogo.png'}
          alt="ProxyHat"
          className={styles.logo}
        />
        <span className={styles.divider} />
        <span className={styles.title}>Checker</span>
        {version && <span className={styles.version}>v{version}</span>}
      </div>
      <div className={styles.actions}>
        {updateAvailable && (
          <button
            className={styles.updateBtn}
            onClick={onUpdate}
            disabled={isUpdating}
            title={`Update to v${updateAvailable.version}`}
          >
            {isUpdating ? 'Updating...' : `Update v${updateAvailable.version}`}
          </button>
        )}
        <a
          href="https://proxyhat.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.brandLink}
        >
          proxyhat.com
        </a>
        <button className={styles.iconBtn} onClick={onSettingsClick} title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
