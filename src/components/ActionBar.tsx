import { useState, useRef } from 'react';
import { FilterState, defaultFilters } from '../utils/filters';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  onAdd: () => void;
  onPaste: () => void;
  onClear: () => void;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onExportClipboard: () => void;
  onExportCsv: () => void;
  onExportTxt: () => void;
  countries: string[];
}

export function ActionBar({
  onAdd, onPaste, onClear, filters, onFiltersChange,
  onExportClipboard, onExportCsv, onExportTxt, countries
}: ActionBarProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <button className={styles.btn} onClick={onPaste}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add
        </button>
        <button className={styles.btn} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Single
        </button>
        <button className={styles.btnDanger} onClick={onClear}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Clear
        </button>
      </div>
      <div className={styles.right}>
        <div className={styles.dropdown} ref={filterRef}>
          <button
            className={`${styles.btn} ${hasActiveFilters ? styles.btnActive : ''}`}
            onClick={() => { setShowFilter(!showFilter); setShowExport(false); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter
          </button>
          {showFilter && (
            <div className={styles.dropdownMenu}>
              <div className={styles.filterGroup}>
                <label>Status</label>
                <select value={filters.status} onChange={e => onFiltersChange({...filters, status: e.target.value as FilterState['status']})}>
                  <option value="all">All</option>
                  <option value="alive">Alive</option>
                  <option value="dead">Dead</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Latency</label>
                <select value={filters.latency} onChange={e => onFiltersChange({...filters, latency: e.target.value as FilterState['latency']})}>
                  <option value="all">All</option>
                  <option value="fast">&lt; 200ms</option>
                  <option value="medium">200-500ms</option>
                  <option value="slow">&gt; 500ms</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Type</label>
                <select value={filters.type} onChange={e => onFiltersChange({...filters, type: e.target.value as FilterState['type']})}>
                  <option value="all">All</option>
                  <option value="http">HTTP</option>
                  <option value="socks5">SOCKS5</option>
                  <option value="socks5h">SOCKS5h</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Country</label>
                <select value={filters.country} onChange={e => onFiltersChange({...filters, country: e.target.value})}>
                  <option value="">All</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Anonymity</label>
                <select value={filters.anonymity} onChange={e => onFiltersChange({...filters, anonymity: e.target.value as FilterState['anonymity']})}>
                  <option value="all">All</option>
                  <option value="elite">Elite</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button className={styles.resetBtn} onClick={() => onFiltersChange(defaultFilters)}>
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
        <div className={styles.dropdown} ref={exportRef}>
          <button className={styles.btn} onClick={() => { setShowExport(!showExport); setShowFilter(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          {showExport && (
            <div className={styles.dropdownMenu}>
              <button className={styles.menuItem} onClick={() => { onExportClipboard(); setShowExport(false); }}>Copy to Clipboard</button>
              <button className={styles.menuItem} onClick={() => { onExportCsv(); setShowExport(false); }}>Export CSV</button>
              <button className={styles.menuItem} onClick={() => { onExportTxt(); setShowExport(false); }}>Export TXT</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
