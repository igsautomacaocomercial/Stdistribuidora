// Cliente de API
const API = {
  async get(path) {
    const r = await fetch(`/api${path}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `GET ${path}: ${r.status}`);
    return data;
  },

  async post(path, body) {
    const r = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `POST ${path}: ${r.status}`);
    return data;
  },

  async put(path, body) {
    const r = await fetch(`/api${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `PUT ${path}: ${r.status}`);
    return data;
  },

  async patch(path, body) {
    const r = await fetch(`/api${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `PATCH ${path}: ${r.status}`);
    return data;
  },

  async del(path) {
    const r = await fetch(`/api${path}`, { method: 'DELETE' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `DELETE ${path}: ${r.status}`);
    return data;
  }
};
