const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, params } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ''}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. It may be waking up, so wait a minute and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const api = {
  reports: (params) => request('/api/reports', { params }),
  report: (id) => request(`/api/reports/${id}`),
  updateReport: (id, body) => request(`/api/reports/${id}`, { method: 'PATCH', body }),
  deleteReport: (id) => request(`/api/reports/${id}`, { method: 'DELETE' }),
  players: (params) => request('/api/players', { params }),
  player: (id) => request(`/api/players/${id}`),
  playerReports: (id) => request(`/api/players/${id}/reports`),
  matches: (params) => request('/api/matches', { params }),
  scouts: (params) => request('/api/scouts', { params }),
  stats: () => request('/api/stats'),
};
