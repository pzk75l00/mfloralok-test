// Debug utility.
// Enable via any of these:
// - Build-time: REACT_APP_DEBUG_LOGS=true
// - Runtime: add ?debug=1 to the URL
// - Runtime: localStorage.setItem('mf_debug','1') or window.mfDebug.enable()

const BUILD_FLAG = process.env.REACT_APP_DEBUG_LOGS === 'true';
const STORAGE_KEY = 'mf_debug';
let runtimeEnabled = false;
const LOG_LIMIT = 300;
const g = (typeof window !== 'undefined') ? window : globalThis;
if (!g.__mfLog) g.__mfLog = [];
if (!g.__mfLogListeners) g.__mfLogListeners = new Set();

function parseQuery() {
	try { return new URLSearchParams(window.location.search); } catch (e) { /* noop */ return new URLSearchParams(); }
}

function initRuntimeFlag() {
	try {
		const q = parseQuery();
		if (q.get('debug') === '1' || q.get('debug') === 'true') return true;
		const ls = localStorage.getItem(STORAGE_KEY);
		return ls === '1' || ls === 'true';
	} catch (e) { /* noop */
		return false;
	}
}

runtimeEnabled = initRuntimeFlag();

export function isDebugEnabled() { return BUILD_FLAG || runtimeEnabled; }
export function setDebugEnabled(v) {
	runtimeEnabled = !!v;
	try { localStorage.setItem(STORAGE_KEY, runtimeEnabled ? '1' : '0'); } catch (e) { /* noop */ }
}

export function dlog(...args) {
	if (!isDebugEnabled()) return;
	try {
		const ts = new Date().toISOString();
		const entry = { ts, args };
		// Buffer in memory
		try {
			g.__mfLog.push(entry);
			if (g.__mfLog.length > LOG_LIMIT) g.__mfLog.shift();
		} catch (e) { /* noop */ }
		// Console
		console.log('[MF]', ts, ...args);
		// Notify listeners
		try {
			g.__mfLogListeners.forEach(cb => {
				try { cb(entry); } catch (_) { /* listener error */ }
			});
		} catch (e) { /* noop */ }
	} catch (e) { /* noop */ }
}

export function getDebugLog() {
	try { return [...g.__mfLog]; } catch (e) { return []; }
}

export function clearDebugLog() {
	try { g.__mfLog.length = 0; } catch (e) { /* noop */ }
}

export function addLogListener(cb) {
	try { g.__mfLogListeners.add(cb); } catch (e) { /* noop */ }
	return () => removeLogListener(cb);
}

export function removeLogListener(cb) {
	try { g.__mfLogListeners.delete(cb); } catch (e) { /* noop */ }
}

// Convenience global toggles for quick use from mobile console/DevTools
if (typeof window !== 'undefined') {
	if (!window.mfDebug) {
		window.mfDebug = {
			enable: () => setDebugEnabled(true),
			disable: () => setDebugEnabled(false),
			on: () => setDebugEnabled(true),
			off: () => setDebugEnabled(false),
			log: (...a) => dlog(...a),
			get: () => getDebugLog(),
			clear: () => clearDebugLog(),
		};
	}
}
