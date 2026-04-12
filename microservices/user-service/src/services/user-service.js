const { OP_CODES } = require('../http/op-codes');
const { signJwt } = require('../lib/jwt');
const { hashPassword, verifyPassword } = require('../lib/password');

function sanitizeUser(user, permissions) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName || null,
    isActive: user.isActive !== false,
    permissions
  };
}

function createUserService({ repository, config }) {
  async function ensureUserDoesNotExist(username, email) {
    const byEmail = await repository.getUserByEmail(email);
    if (byEmail) {
      const error = new Error('Email ya registrado');
      error.statusCode = 409;
      error.intOpCode = OP_CODES.USER_ALREADY_EXISTS;
      throw error;
    }

    const byUsername = await repository.getUserByUsername(username);
    if (byUsername) {
      const error = new Error('Username ya registrado');
      error.statusCode = 409;
      error.intOpCode = OP_CODES.USER_ALREADY_EXISTS;
      throw error;
    }
  }

  function validateRequired(fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== 'string' || !value.trim()) {
        const error = new Error(`El campo ${key} es obligatorio`);
        error.statusCode = 400;
        error.intOpCode = OP_CODES.VALIDATION_ERROR;
        throw error;
      }
    }
  }

  async function buildSession(user) {
    const permissions = await repository.getPermissionsForUser(user.id);
    const profile = sanitizeUser(user, permissions);
    const token = signJwt(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        permissions
      },
      config.jwtSecret,
      config.jwtTtlSeconds
    );

    return {
      token,
      user: profile,
      message: 'Operación completada correctamente'
    };
  }

  return {
    async health() {
      return repository.health();
    },

    async register(payload) {
      validateRequired({
        username: payload.username,
        email: payload.email,
        password: payload.password
      });

      await ensureUserDoesNotExist(payload.username, payload.email);

      const created = await repository.createUser({
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
        passwordHash: hashPassword(payload.password),
        permissions: ['user-view', 'users-view', 'ticket-view', 'tickets-view']
      });

      return buildSession(created);
    },

    async login(payload) {
      validateRequired({
        userOrEmail: payload.userOrEmail,
        password: payload.password
      });

      const key = payload.userOrEmail.trim();
      const user = key.includes('@')
        ? await repository.getUserByEmail(key)
        : await repository.getUserByUsername(key);

      if (!user || !verifyPassword(payload.password, user.passwordHash)) {
        const error = new Error('Credenciales inválidas');
        error.statusCode = 401;
        error.intOpCode = OP_CODES.INVALID_CREDENTIALS;
        throw error;
      }

      return buildSession(user);
    },

    async createUser(payload) {
      validateRequired({
        username: payload.username,
        email: payload.email,
        password: payload.password
      });

      await ensureUserDoesNotExist(payload.username, payload.email);

      const created = await repository.createUser({
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
        passwordHash: hashPassword(payload.password),
        permissions: payload.permissions || []
      });

      const permissions = await repository.getPermissionsForUser(created.id);
      return {
        user: sanitizeUser(created, permissions),
        message: 'Usuario creado correctamente'
      };
    },

    async listUsers() {
      const users = await repository.listUsers();
      const enriched = await Promise.all(
        users.map(async user => ({
          ...sanitizeUser(user, await repository.getPermissionsForUser(user.id))
        }))
      );

      return {
        users: enriched,
        message: 'Usuarios obtenidos correctamente'
      };
    },

    async updateProfile(userId, payload) {
      const current = await repository.getUserById(userId);
      if (!current) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        error.intOpCode = OP_CODES.USER_NOT_FOUND;
        throw error;
      }

      if (payload.email && payload.email !== current.email) {
        const byEmail = await repository.getUserByEmail(payload.email);
        if (byEmail && byEmail.id !== userId) {
          const error = new Error('Email ya registrado');
          error.statusCode = 409;
          error.intOpCode = OP_CODES.USER_ALREADY_EXISTS;
          throw error;
        }
      }

      if (payload.username && payload.username !== current.username) {
        const byUsername = await repository.getUserByUsername(payload.username);
        if (byUsername && byUsername.id !== userId) {
          const error = new Error('Username ya registrado');
          error.statusCode = 409;
          error.intOpCode = OP_CODES.USER_ALREADY_EXISTS;
          throw error;
        }
      }

      const updated = await repository.updateUser(userId, payload);
      const permissions = await repository.getPermissionsForUser(userId);

      return {
        user: sanitizeUser(updated, permissions),
        message: 'Perfil actualizado correctamente'
      };
    },

    async updatePassword(userId, payload) {
      validateRequired({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword
      });

      const current = await repository.getUserById(userId);
      if (!current) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        error.intOpCode = OP_CODES.USER_NOT_FOUND;
        throw error;
      }

      if (!verifyPassword(payload.currentPassword, current.passwordHash)) {
        const error = new Error('La contraseña actual no coincide');
        error.statusCode = 401;
        error.intOpCode = OP_CODES.INVALID_CREDENTIALS;
        throw error;
      }

      await repository.updatePassword(userId, hashPassword(payload.newPassword));

      return {
        message: 'Contraseña actualizada correctamente'
      };
    },

    async updateUserAdmin(userId, payload) {
      const current = await repository.getUserById(userId);
      if (!current) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        error.intOpCode = OP_CODES.USER_NOT_FOUND;
        throw error;
      }

      await this.updateProfile(userId, payload);

      if (payload.password) {
        await repository.updatePassword(userId, hashPassword(payload.password));
      }

      if (Array.isArray(payload.permissions)) {
        await this.assignPermissions(userId, payload.permissions);
      }

      const refreshed = await repository.getUserById(userId);
      const permissions = await repository.getPermissionsForUser(userId);

      return {
        user: sanitizeUser(refreshed, permissions),
        message: 'Usuario actualizado correctamente'
      };
    },

    async deleteCurrentUser(userId) {
      const current = await repository.getUserById(userId);
      if (!current) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        error.intOpCode = OP_CODES.USER_NOT_FOUND;
        throw error;
      }

      await repository.deleteUser(userId);
      return {
        message: 'Cuenta eliminada correctamente'
      };
    },

    async deleteUserAdmin(userId) {
      const current = await repository.getUserById(userId);
      if (!current) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        error.intOpCode = OP_CODES.USER_NOT_FOUND;
        throw error;
      }

      await repository.deleteUser(userId);
      return {
        message: 'Usuario eliminado correctamente'
      };
    },

    async assignPermissions(targetUserId, permissions) {
      const current = await repository.getUserById(targetUserId);
      if (!current) {
        const error = new Error('Usuario no encontrado');
        error.statusCode = 404;
        error.intOpCode = OP_CODES.USER_NOT_FOUND;
        throw error;
      }

      const available = new Set(await repository.listPermissions());
      const invalid = permissions.filter(permission => !available.has(permission));

      if (invalid.length) {
        const error = new Error(`Permisos inválidos: ${invalid.join(', ')}`);
        error.statusCode = 400;
        error.intOpCode = OP_CODES.VALIDATION_ERROR;
        throw error;
      }

      const assigned = await repository.assignPermissions(targetUserId, permissions);
      return {
        permissions: assigned,
        message: 'Permisos asignados correctamente'
      };
    },

    async getPermissions(userId) {
      return {
        permissions: await repository.getPermissionsForUser(userId),
        message: 'Permisos obtenidos correctamente'
      };
    }
  };
}

module.exports = { createUserService };
