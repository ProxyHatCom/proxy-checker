import { useState, useEffect } from 'react';
import { parseProxyList } from '../utils/proxyParser';
import styles from './BulkPasteModal.module.css';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (proxies: ReturnType<typeof parseProxyList>) => void;
}

export function BulkPasteModal({ isOpen, onClose, onImport }: BulkPasteModalProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsed = text.trim() ? parseProxyList(text) : [];

  const handleImport = () => {
    if (parsed.length > 0) {
      onImport(parsed);
      setText('');
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Paste Proxies</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className={styles.body}>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Paste proxies, one per line. Supported formats:\n\nhost:port\nhost:port:user:pass\nuser:pass@host:port\nsocks5://user:pass@host:port\nhttp://user:pass@host:port`}
            rows={12}
            autoFocus
            spellCheck={false}
            maxLength={500000}
          />
          <div className={styles.preview}>
            {parsed.length > 0 ? (
              <span className={styles.previewOk}>Parsed: {parsed.length} proxies</span>
            ) : text.trim() ? (
              <span className={styles.previewErr}>No valid proxies found</span>
            ) : null}
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.importBtn} onClick={handleImport} disabled={parsed.length === 0}>
            Import {parsed.length > 0 ? `(${parsed.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
