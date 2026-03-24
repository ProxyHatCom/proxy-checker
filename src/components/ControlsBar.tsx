import styles from './ControlsBar.module.css';

interface ControlsBarProps {
  url: string;
  onUrlChange: (url: string) => void;
  threads: number;
  onThreadsChange: (n: number) => void;
  onCheckAll: () => void;
  onStop: () => void;
  isChecking: boolean;
}

export function ControlsBar({
  url, onUrlChange, threads, onThreadsChange, onCheckAll, onStop, isChecking
}: ControlsBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.urlGroup}>
        <label className={styles.label}>URL</label>
        <input
          className={styles.urlInput}
          value={url}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="https://google.com"
          spellCheck={false}
        />
      </div>
      <div className={styles.threadGroup}>
        <label className={styles.label}>Threads: {threads}</label>
        <input
          type="range"
          min="1"
          max="50"
          value={threads}
          onChange={e => onThreadsChange(parseInt(e.target.value))}
          className={styles.slider}
          aria-label="Thread count"
        />
      </div>
      <button
        className={`${styles.checkBtn} ${isChecking ? styles.stopBtn : ''}`}
        onClick={isChecking ? onStop : onCheckAll}
      >
        {isChecking ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
            Stop
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Check All
          </>
        )}
      </button>
    </div>
  );
}
