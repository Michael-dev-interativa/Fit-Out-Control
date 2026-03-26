import { base44 } from '@/api/base44Client';

const resource = 'relatorios-entrada';

async function request(path = '', options = {}) {
  const response = await fetch(`/api/${resource}${path}`, options);
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${resource} failed`);
  }
  return response.json();
}

export const RelatorioEntrada = {
  async list(order) {
    const params = new URLSearchParams();
    if (order) params.append('order', order);
    return request(params.toString() ? `?${params.toString()}` : '');
  },
  async filter(criteria = {}, order) {
    const params = new URLSearchParams();
    Object.entries(criteria || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, value);
    });
    if (order) params.append('order', order);
    return request(params.toString() ? `?${params.toString()}` : '');
  },
  async get(id) {
    return request(`/${id}`);
  },
  async create(data) {
    return request('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async update(id, data) {
    return request(`/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  async delete(id) {
    return request(`/${id}`, { method: 'DELETE' });
  }
};

try {
  base44.entities = base44.entities || {};
  base44.entities.RelatorioEntrada = RelatorioEntrada;
} catch {
  // ignore in static build
}