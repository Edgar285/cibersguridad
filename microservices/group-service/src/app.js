const express = require('express');
const { createMemoryGroupRepository } = require('./repositories/memory-group-repository');
const { createAuthMiddleware } = require('./middleware/auth');
const { send } = require('./http/response');
const { OP_CODES } = require('./http/op-codes');

function createApp() {
  const jwtSecret = process.env.JWT_SECRET || 'changeme-secret';

  // Usar Supabase si las variables de entorno están presentes
  let repo;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (supabaseUrl && supabaseKey) {
    const { createSupabaseGroupRepository } = require('./repositories/supabase-group-repository');
    repo = createSupabaseGroupRepository({ supabaseUrl, supabaseKey });
    console.log('[group-service] Usando repositorio Supabase');
  } else {
    repo = createMemoryGroupRepository();
    console.log('[group-service] Usando repositorio en memoria (los datos no persisten)');
  }

  const { requireAuth, requirePermission } = createAuthMiddleware(jwtSecret);

  const app = express();

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next();
  });

  app.use(express.json());

  // ── Health ─────────────────────────────────────────────────────
  app.get('/api/v1/groups/health', (_req, res) => {
    return send(res, 200, OP_CODES.SUCCESS, { service: 'group-service', status: 'ok' });
  });

  // ── GET /api/v1/groups ─────────────────────────────────────────
  app.get('/api/v1/groups', requireAuth, requirePermission('groups:view'), async (_req, res) => {
    try {
      return send(res, 200, OP_CODES.SUCCESS, { groups: await repo.findAll() });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── GET /api/v1/groups/:id ─────────────────────────────────────
  app.get('/api/v1/groups/:id', requireAuth, requirePermission('groups:view'), async (req, res) => {
    try {
      const group = await repo.findById(req.params.id);
      if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
      return send(res, 200, OP_CODES.SUCCESS, { group });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── POST /api/v1/groups ────────────────────────────────────────
  app.post('/api/v1/groups', requireAuth, requirePermission('groups:add'), async (req, res) => {
    try {
      const { nombre, descripcion, nivel, actor, integrantes, tickets, estado } = req.body ?? {};
      if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
        return send(res, 400, OP_CODES.VALIDATION_ERROR, { message: 'El nombre del grupo es obligatorio (mínimo 2 caracteres)' });
      }
      const group = await repo.create({ nombre: nombre.trim(), descripcion, nivel, actor, integrantes, tickets, estado });
      return send(res, 201, OP_CODES.SUCCESS, { group });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── PATCH /api/v1/groups/:id ───────────────────────────────────
  app.patch('/api/v1/groups/:id', requireAuth, requirePermission('groups:edit'), async (req, res) => {
    try {
      const group = await repo.findById(req.params.id);
      if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
      const allowed = ['nombre', 'descripcion', 'nivel', 'actor', 'integrantes', 'tickets', 'estado'];
      const changes = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) changes[key] = req.body[key];
      }
      const updated = await repo.update(req.params.id, changes);
      return send(res, 200, OP_CODES.SUCCESS, { group: updated });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── DELETE /api/v1/groups/:id ──────────────────────────────────
  app.delete('/api/v1/groups/:id', requireAuth, requirePermission('groups:delete'), async (req, res) => {
    try {
      const group = await repo.findById(req.params.id);
      if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
      await repo.delete(req.params.id);
      return send(res, 200, OP_CODES.SUCCESS, { message: 'Grupo eliminado' });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── GET /api/v1/groups/:id/members ────────────────────────────
  app.get('/api/v1/groups/:id/members', requireAuth, requirePermission('groups:view'), async (req, res) => {
    try {
      const group = await repo.findById(req.params.id);
      if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
      return send(res, 200, OP_CODES.SUCCESS, { members: await repo.getMembers(req.params.id) });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── PUT /api/v1/groups/:id/members/:userId ─────────────────────
  app.put('/api/v1/groups/:id/members/:userId', requireAuth, requirePermission('groups:edit'), async (req, res) => {
    try {
      const group = await repo.findById(req.params.id);
      if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
      const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
      await repo.setMemberPermissions(req.params.id, req.params.userId, permissions);
      return send(res, 200, OP_CODES.SUCCESS, {
        userId: req.params.userId,
        groupId: req.params.id,
        permissions
      });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // ── DELETE /api/v1/groups/:id/members/:userId ──────────────────
  app.delete('/api/v1/groups/:id/members/:userId', requireAuth, requirePermission('groups:edit'), async (req, res) => {
    try {
      await repo.removeMember(req.params.id, req.params.userId);
      return send(res, 200, OP_CODES.SUCCESS, { message: 'Miembro removido' });
    } catch (err) {
      return send(res, 500, OP_CODES.INTERNAL_ERROR, { message: err.message });
    }
  });

  // Handler global de errores
  app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode ?? 500;
    return send(res, statusCode, OP_CODES.INTERNAL_ERROR, { message: err.message ?? 'Error interno' });
  });

  return app;
}

module.exports = { createApp };
