import { useState, useRef, useEffect } from 'react';
import { ProxyType } from '../types/proxy';
import styles from './SelectionBar.module.css';

interface SelectionBarProps {
  count: number;
  total: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onChangeType: (type: ProxyType) => void;
  onChangePort: (port: number) => void;
  onRecheck: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function SelectionBar({
  count, total, onSelectAll, onDeselectAll,
  onChangeType, onChangePort, onRecheck, onCopy, onDelete,
}: SelectionBarProps) {
  const [showPortInput, setShowPortInput] = useState(false);
  const [portValue, setPortValue] = useState('');
  const portRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPortInput && portRef.current) portRef.current.focus();
  }, [showPortInput]);

  const handlePortSubmit = () => {
    const port = parseInt(portValue, 10);
    if (port >= 1 && port <= 65535) {
      onChangePort(port);
      setShowPortInput(false);
      setPortValue('');
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.count}>{count} selected</span>
        <button className={styles.link} onClick={count < total ? onSelectAll : onDeselectAll}>
          {count < total ? 'Select all' : 'Deselect all'}
        </button>
      </div>
      <div className={styles.actions}>
        <select
          className={styles.typeSelect}
          value=""
          onChange={e => { if (e.target.value) onChangeType(e.target.value as ProxyType); }}
        >
          <option value="" disabled>Type</option>
          <option value="http">HTTP</option>
          <option value="socks5">SOCKS5</option>
          <option value="socks5h">SOCKS5h</option>
        </select>

        {showPortInput ? (
          <div className={styles.portInputWrap}>
            <input
              ref={portRef}
              className={styles.portInput}
              type="number"
              value={portValue}
              onChange={e => setPortValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handlePortSubmit();
                if (e.key === 'Escape') { setShowPortInput(false); setPortValue(''); }
              }}
              placeholder="Port"
              min={1}
              max={65535}
            />
            <button className={styles.portOk} onClick={handlePortSubmit}>OK</button>
          </div>
        ) : (
          <button className={styles.actionBtn} onClick={() => setShowPortInput(true)} title="Change port">
            Port
          </button>
        )}

        <div className={styles.sep} />

        <button className={styles.actionBtn} onClick={onRecheck} title="Re-check selected">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Re-check
        </button>
        <button className={styles.actionBtn} onClick={onCopy} title="Copy selected">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </button>

        <div className={styles.sep} />

        <button className={styles.deleteBtn} onClick={onDelete} title="Delete selected">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  );
}
