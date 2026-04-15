function createSupabaseRepository(config) {
  const baseUrl = config.supabaseUrl.replace(/\/+$/, '');
  const headers = {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'Content-Type': 'application/json'
  };

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error ${response.status}: ${errorText}`);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  }

  function encode(value) {
    return encodeURIComponent(value);
  }

  function mapUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      passwordHash: row.password_hash
    };
  }

  return {
    async health() {
      await request('permissions?select=id&limit=1');
      return { storage: 'supabase', ok: true };
    },

    async getUserByEmail(email) {
      const rows = await request(`users?select=*&email=eq.${encode(email)}&limit=1`);
      return mapUser(rows[0] || null);
    },

    async getUserByUsername(username) {
      const rows = await request(`users?select=*&username=eq.${encode(username)}&limit=1`);
      return mapUser(rows[0] || null);
    },

    async getUserById(id) {
      const rows = await request(`users?select=*&id=eq.${encode(id)}&limit=1`);
      return mapUser(rows[0] || null);
    },

    async listUsers() {
      const rows = await request('users?select=*&order=created_at.desc');
      return rows.map(mapUser);
    },

    async createUser(payload) {
      const rows = await request('users', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([
          {
            username: payload.username.trim(),
            email: payload.email.trim().toLowerCase(),
            full_name: payload.fullName?.trim() || null,
            password_hash: payload.passwordHash,
            is_active: true
          }
        ])
      });
      const user = mapUser(rows[0] || null);
      if (user && payload.permissions?.length) {
        await this.assignPermissions(user.id, payload.permissions);
      }
      return user;
    },

    async updateUser(userId, payload) {
      const rows = await request(`users?id=eq.${encode(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          ...(payload.username ? { username: payload.username.trim() } : {}),
          ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
          ...(payload.fullName !== undefined ? { full_name: payload.fullName?.trim() || null } : {})
        })
      });
      return mapUser(rows[0] || null);
    },

    async updatePassword(userId, passwordHash) {
      const rows = await request(`users?id=eq.${encode(userId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          password_hash: passwordHash
        })
      });
      return mapUser(rows[0] || null);
    },

    async deleteUser(userId) {
      await request(`users?id=eq.${encode(userId)}`, {
        method: 'DELETE'
      });
      return true;
    },

    async listPermissions() {
      const rows = await request('permissions?select=code&order=code.asc');
      return rows.map(row => row.code);
    },

    async getPermissionsForUser(userId) {
      const rows = await request(
        `user_permissions?select=permissions(code)&user_id=eq.${encode(userId)}`
      );
      return rows
        .map(row => row.permissions?.code)
        .filter(Boolean);
    },

    async assignPermissions(userId, nextPermissions) {
      await request(`user_permissions?user_id=eq.${encode(userId)}`, {
        method: 'DELETE'
      });

      if (!nextPermissions.length) {
        return [];
      }

      const permissions = await request(
        `permissions?select=id,code&code=in.(${nextPermissions.map(encode).join(',')})`
      );

      const rows = permissions.map(permission => ({
        user_id: userId,
        permission_id: permission.id
      }));

      await request('user_permissions', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(rows)
      });

      return nextPermissions;
    }
  };
}

module.exports = { createSupabaseRepository };
