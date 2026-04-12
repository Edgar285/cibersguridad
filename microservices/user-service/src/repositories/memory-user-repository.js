const { hashPassword } = require('../lib/password');

function createMemoryRepository(config) {
  const permissions = [...config.defaultPermissions];
  const users = [
    {
      id: 'seed-super-admin',
      username: 'superAdmin',
      email: 'super@erp.com',
      fullName: 'Super Admin',
      passwordHash: hashPassword('Super123!'),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  const userPermissions = new Map([
    ['seed-super-admin', [...permissions]]
  ]);

  function sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return { ...rest };
  }

  function now() {
    return new Date().toISOString();
  }

  return {
    async health() {
      return { storage: 'memory', ok: true };
    },

    async getUserByEmail(email) {
      return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
    },

    async getUserByUsername(username) {
      return users.find(user => user.username.toLowerCase() === username.toLowerCase()) || null;
    },

    async getUserById(id) {
      return users.find(user => user.id === id) || null;
    },

    async listUsers() {
      return users.map(user => sanitizeUser(user));
    },

    async createUser(payload) {
      const record = {
        id: `usr-${Date.now()}`,
        username: payload.username.trim(),
        email: payload.email.trim().toLowerCase(),
        fullName: payload.fullName?.trim() || null,
        passwordHash: payload.passwordHash,
        isActive: true,
        createdAt: now(),
        updatedAt: now()
      };
      users.push(record);
      userPermissions.set(record.id, [...(payload.permissions || [])]);
      return sanitizeUser(record);
    },

    async updateUser(userId, payload) {
      const index = users.findIndex(user => user.id === userId);
      if (index < 0) return null;
      users[index] = {
        ...users[index],
        ...payload,
        updatedAt: now()
      };
      return sanitizeUser(users[index]);
    },

    async updatePassword(userId, passwordHash) {
      const index = users.findIndex(user => user.id === userId);
      if (index < 0) return null;
      users[index] = {
        ...users[index],
        passwordHash,
        updatedAt: now()
      };
      return sanitizeUser(users[index]);
    },

    async deleteUser(userId) {
      const index = users.findIndex(user => user.id === userId);
      if (index < 0) return false;
      users.splice(index, 1);
      userPermissions.delete(userId);
      return true;
    },

    async listPermissions() {
      return [...permissions];
    },

    async getPermissionsForUser(userId) {
      return [...(userPermissions.get(userId) || [])];
    },

    async assignPermissions(userId, nextPermissions) {
      userPermissions.set(userId, [...nextPermissions]);
      return [...nextPermissions];
    }
  };
}

module.exports = { createMemoryRepository };
