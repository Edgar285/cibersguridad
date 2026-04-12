const express = require('express');
const { createConfig } = require('./config');
const { createMemoryRepository } = require('./repositories/memory-user-repository');
const { createSupabaseRepository } = require('./repositories/supabase-user-repository');
const { createUserService } = require('./services/user-service');
const { createAuthMiddleware } = require('./middleware/auth');
const { send } = require('./http/response');
const { OP_CODES } = require('./http/op-codes');

function createRepository(config) {
  if (config.storageMode === 'supabase') {
    if (!config.supabaseUrl || !config.supabaseKey) {
      const error = new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
      error.statusCode = 500;
      error.intOpCode = OP_CODES.CONFIG_ERROR;
      throw error;
    }
    return createSupabaseRepository(config);
  }

  return createMemoryRepository(config);
}

function createApp() {
  const config = createConfig();
  const repository = createRepository(config);
  const service = createUserService({ repository, config });
  const { requireAuth, requirePermissions } = createAuthMiddleware(config);
  const app = express();

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  });

  app.use(express.json());

  app.get('/api/v1/users/health', async (_req, res, next) => {
    try {
      const result = await service.health();
      return send(res, 200, OP_CODES.SUCCESS, {
        service: config.serviceName,
        ...result,
        message: 'Servicio disponible'
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/v1/users/auth/register', async (req, res, next) => {
    try {
      return send(res, 201, OP_CODES.SUCCESS, await service.register(req.body || {}));
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/v1/users/auth/login', async (req, res, next) => {
    try {
      return send(res, 200, OP_CODES.SUCCESS, await service.login(req.body || {}));
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/users/permissions', requireAuth, async (req, res, next) => {
    try {
      return send(res, 200, OP_CODES.SUCCESS, await service.getPermissions(req.auth.sub));
    } catch (error) {
      return next(error);
    }
  });

  app.post(
    '/api/v1/users/admin/users',
    requireAuth,
    requirePermissions(['user-add', 'super-admin'], 'any'),
    async (req, res, next) => {
      try {
        return send(res, 201, OP_CODES.SUCCESS, await service.createUser(req.body || {}));
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    '/api/v1/users/admin/users',
    requireAuth,
    requirePermissions(['users-view', 'user-view', 'super-admin'], 'any'),
    async (_req, res, next) => {
      try {
        return send(res, 200, OP_CODES.SUCCESS, await service.listUsers());
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    '/api/v1/users/admin/users/:userId',
    requireAuth,
    requirePermissions(['users-edit', 'user-edit', 'super-admin'], 'any'),
    async (req, res, next) => {
      try {
        return send(
          res,
          200,
          OP_CODES.SUCCESS,
          await service.updateUserAdmin(req.params.userId, req.body || {})
        );
      } catch (error) {
        return next(error);
      }
    }
  );

  app.delete(
    '/api/v1/users/admin/users/:userId',
    requireAuth,
    requirePermissions(['user-delete', 'super-admin'], 'any'),
    async (req, res, next) => {
      try {
        return send(res, 200, OP_CODES.SUCCESS, await service.deleteUserAdmin(req.params.userId));
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch('/api/v1/users/profile', requireAuth, async (req, res, next) => {
    try {
      return send(res, 200, OP_CODES.SUCCESS, await service.updateProfile(req.auth.sub, req.body || {}));
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/v1/users/profile', requireAuth, async (req, res, next) => {
    try {
      return send(res, 200, OP_CODES.SUCCESS, await service.deleteCurrentUser(req.auth.sub));
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/v1/users/profile/password', requireAuth, async (req, res, next) => {
    try {
      return send(res, 200, OP_CODES.SUCCESS, await service.updatePassword(req.auth.sub, req.body || {}));
    } catch (error) {
      return next(error);
    }
  });

  app.put(
    '/api/v1/users/:userId/permissions',
    requireAuth,
    requirePermissions(['users-edit', 'user-edit', 'super-admin'], 'any'),
    async (req, res, next) => {
      try {
        const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
        return send(res, 200, OP_CODES.SUCCESS, await service.assignPermissions(req.params.userId, permissions));
      } catch (error) {
        return next(error);
      }
    }
  );

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    const intOpCode = error.intOpCode || OP_CODES.INTERNAL_ERROR;
    return send(res, statusCode, intOpCode, {
      message: error.message || 'Unexpected error'
    });
  });

  return app;
}

module.exports = { createApp };
