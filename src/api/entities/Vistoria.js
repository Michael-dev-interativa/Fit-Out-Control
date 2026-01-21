export const Vistoria = {
  async create(data) {
    const res = await fetch('/api/vistorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('CREATE vistoria failed');
    return res.json();
  },
  async get(id) {
    const res = await fetch(`/api/vistorias/${id}`);
    if (!res.ok) throw new Error(`GET vistoria ${id} failed`);
    return res.json();
  },
  async list(criteria = {}, order) {
    const params = new URLSearchParams();
    Object.entries(criteria || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    if (order) params.append('order', order);
    const res = await fetch(`/api/vistorias?${params.toString()}`);
    if (!res.ok) throw new Error('LIST vistorias failed');
    return res.json();
  },
};
