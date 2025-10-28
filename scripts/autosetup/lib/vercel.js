const https = require('https');

function request({ method, path, token, teamId, body }) {
  return new Promise((resolve, reject) => {
    const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: `${path}${query}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); }
        } else {
          reject(new Error(`Vercel API ${method} ${path} -> ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getProject({ token, projectIdOrName, teamId }) {
  return request({ method: 'GET', path: `/v10/projects/${encodeURIComponent(projectIdOrName)}`, token, teamId });
}

async function upsertEnv({ token, projectIdOrName, teamId, key, value, target = ['production'] }) {
  // Delete existing
  try {
    const list = await request({ method: 'GET', path: `/v10/projects/${encodeURIComponent(projectIdOrName)}/env`, token, teamId });
    const existing = (list?.envs || []).filter(e => e.key === key);
    for (const e of existing) {
      await request({ method: 'DELETE', path: `/v10/projects/${encodeURIComponent(projectIdOrName)}/env/${e.id}`, token, teamId });
    }
  } catch (e) {
    // continue (project may be not found)
  }
  // Create new
  return request({ method: 'POST', path: `/v10/projects/${encodeURIComponent(projectIdOrName)}/env`, token, teamId, body: { key, value, target, type: 'encrypted' } });
}

module.exports = { getProject, upsertEnv };
