// Debug utility. Enable by setting REACT_APP_DEBUG_LOGS=true at build time.
export const DEBUG_LOGS = process.env.REACT_APP_DEBUG_LOGS === 'true';
export const dlog = (...args) => { if (DEBUG_LOGS) console.log(...args); };
