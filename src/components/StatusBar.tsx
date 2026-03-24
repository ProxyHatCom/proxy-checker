import { ProxyRow } from '../types/proxy';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  proxies: ProxyRow[];
}

export function StatusBar({ proxies }: StatusBarProps) {
  const total = proxies.length;
  const alive = proxies.filter(p => p.result?.status === 'alive').length;
  const dead = proxies.filter(p => p.result?.status === 'dead').length;
  const checking = proxies.filter(p => p.result?.status === 'checking').length;
  const latencies = proxies
    .filter(p => p.result?.latency_ms != null)
    .map(p => p.result!.latency_ms!);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <span className={styles.label}>Total</span>
        <span className={styles.value}>{total}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.label}>Alive</span>
        <span className={`${styles.value} ${styles.alive}`}>{alive}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.label}>Dead</span>
        <span className={`${styles.value} ${styles.dead}`}>{dead}</span>
      </div>
      {checking > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.stat}>
            <span className={styles.label}>Checking</span>
            <span className={`${styles.value} ${styles.checking}`}>{checking}</span>
          </div>
        </>
      )}
      <div className={styles.spacer} />
      <div className={styles.stat}>
        <span className={styles.label}>Avg Latency</span>
        <span className={styles.value}>{avgLatency > 0 ? `${avgLatency}ms` : '--'}</span>
      </div>
    </div>
  );
}
