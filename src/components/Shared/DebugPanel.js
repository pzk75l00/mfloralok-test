import React, { useEffect, useState } from 'react';
import { isDebugEnabled, getDebugLog, addLogListener, clearDebugLog } from '../../utils/debug';

// Lightweight on-screen debug panel for mobile troubleshooting
export default function DebugPanel() {
  const [visible, setVisible] = useState(isDebugEnabled());
  const [logs, setLogs] = useState(() => getDebugLog());
  const [onlyAuth, setOnlyAuth] = useState(true);

  useEffect(() => {
    if (!isDebugEnabled()) return; // don't render or subscribe when disabled
    const unsub = addLogListener(() => {
      // Pull the whole buffer to keep it simple and robust
      setLogs(getDebugLog());
    });
    return () => { try { unsub && unsub(); } catch { /* noop */ } };
  }, []);

  // Compute filtered logs without hooks to avoid conditional-hook order issues
  const filtered = (() => {
    if (!onlyAuth) return logs;
    try {
      return logs.filter(l => (l.args || []).some(a => typeof a === 'string' && a.includes('[auth]')));
    } catch (e) {
      return logs;
    }
  })();

  if (!isDebugEnabled() || !visible) return null;

  const styles = {
    wrap: {
      position: 'fixed', bottom: 10, left: 10, right: 10, zIndex: 9999,
      background: 'rgba(17,24,39,0.92)', color: '#e5e7eb',
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      maxHeight: '40vh', overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 12
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 10px', background: 'rgba(31,41,55,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)'
    },
    body: { padding: 8 },
    btn: {
      padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', color: '#e5e7eb',
      background: 'rgba(55,65,81,0.8)', fontSize: 11, fontWeight: 700
    },
    line: { margin: '2px 0', whiteSpace: 'pre-wrap' },
    pill: (active) => ({
      padding: '2px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)',
      background: active ? 'rgba(16,185,129,0.25)' : 'transparent', color: '#e5e7eb', fontSize: 11,
    })
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <strong>Debug</strong>
          <button onClick={() => setOnlyAuth(v => !v)} style={styles.pill(onlyAuth)}>
            Solo [auth]
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { clearDebugLog(); setLogs([]); }} style={styles.btn}>Limpiar</button>
          <button onClick={() => setVisible(false)} style={styles.btn}>Cerrar</button>
        </div>
      </div>
      <div style={styles.body}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Sin eventos aún… tocá “Ingresar con Google”.</div>
        ) : (
          filtered.slice(-80).map((l, i) => (
            <div style={styles.line} key={i}>
              <span style={{ opacity: 0.6 }}>{l.ts}</span> — {l.args.map((a) => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
