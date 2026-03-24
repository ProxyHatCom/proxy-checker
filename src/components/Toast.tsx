import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  toast: { message: string; type: 'success' | 'error' } | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`${styles.toast} ${toast.type === 'error' ? styles.error : styles.success}`}>
      {toast.message}
    </div>
  );
}
