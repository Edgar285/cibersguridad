function createSupabaseGroupRepository(config) {
  const baseUrl = config.supabaseUrl.replace(/\/+$/, '');
  const baseHeaders = {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'Content-Type': 'application/json'
  };

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...options,
      headers: { ...baseHeaders, ...(options.headers || {}) }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  }

  const enc = encodeURIComponent;

  function mapGroup(row) {
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      nivel: row.nivel || '',
      actor: row.actor || '',
      integrantes: row.integrantes || 0,
      tickets: row.tickets || 0,
      estado: row.estado || 'success',
      createdAt: row.created_at
    };
  }

  return {
    async findAll() {
      const rows = await request('erp_groups?select=*&order=created_at.desc');
      return (rows || []).map(mapGroup);
    },

    async findById(id) {
      const rows = await request(`erp_groups?id=eq.${enc(id)}&limit=1`);
      return mapGroup(rows[0] || null);
    },

    async create(data) {
      const rows = await request('erp_groups', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([{
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          nivel: data.nivel || '',
          actor: data.actor || '',
          integrantes: data.integrantes || 0,
          tickets: data.tickets || 0,
          estado: data.estado || 'success'
        }])
      });
      return mapGroup(rows[0] || null);
    },

    async update(id, changes) {
      const allowed = ['nombre', 'descripcion', 'nivel', 'actor', 'integrantes', 'tickets', 'estado'];
      const dbChanges = {};
      for (const key of allowed) {
        if (changes[key] !== undefined) dbChanges[key] = changes[key];
      }
      const rows = await request(`erp_groups?id=eq.${enc(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(dbChanges)
      });
      return mapGroup(rows[0] || null);
    },

    async delete(id) {
      await request(`erp_groups?id=eq.${enc(id)}`, { method: 'DELETE' });
      return true;
    },

    async getMembers(groupId) {
      const rows = await request(
        `erp_group_members?group_id=eq.${enc(groupId)}&select=user_id,permissions`
      );
      return (rows || []).map(r => ({ userId: r.user_id, permissions: r.permissions || [] }));
    },

    async getMemberPermissions(groupId, userId) {
      const rows = await request(
        `erp_group_members?group_id=eq.${enc(groupId)}&user_id=eq.${enc(userId)}&limit=1`
      );
      return rows[0]?.permissions || [];
    },

    async setMemberPermissions(groupId, userId, permissions) {
      await request('erp_group_members', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ group_id: groupId, user_id: userId, permissions }])
      });
    },

    async removeMember(groupId, userId) {
      await request(
        `erp_group_members?group_id=eq.${enc(groupId)}&user_id=eq.${enc(userId)}`,
        { method: 'DELETE' }
      );
    }
  };
}

module.exports = { createSupabaseGroupRepository };
