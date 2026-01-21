export const RelatorioSemanal = {
  async get(id) {
    const res = await fetch(`/api/relatorios-semanais/${id}`);
    if (!res.ok) throw new Error(`GET relatorio ${id} failed`);
    return res.json();
  },
  async create(data) {
    const res = await fetch(`/api/relatorios-semanais`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('CREATE relatorio failed');
    return res.json();
  },
  async update(id, data) {
    const res = await fetch(`/api/relatorios-semanais/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`UPDATE relatorio ${id} failed`);
    return res.json();
  },
  async delete(id) {
    const res = await fetch(`/api/relatorios-semanais/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE relatorio ${id} failed`);
    return res.json();
  },
  async filter(criteria = {}, order) {
    const params = new URLSearchParams();
    Object.entries(criteria || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    if (order) params.append('order', order);
    const res = await fetch(`/api/relatorios-semanais?${params.toString()}`);
    if (!res.ok) throw new Error('FILTER relatorios failed');
    return res.json();
  },
};
