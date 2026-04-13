const express = require('express');
const { createMemoryGroupRepository } = require('./repositories/memory-group-repository');
const { createAuthMiddleware } = require('./middleware/auth');
const { send } = require('./http/response');
const { OP_CODES } = require('./http/op-codes');

function createApp() {
  const jwtSecret = process.env.JWT_SECRET || 'changeme-secret';
  const repo = createMemoryGroupRepository();
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

  // ── GET /api/v1/groups — listar todos los grupos ───────────────
  // Requiere: groups-view
  app.get('/api/v1/groups', requireAuth, requirePermission('groups:view'), (_req, res) => {
    return send(res, 200, OP_CODES.SUCCESS, { groups: repo.findAll() });
  });

  // ── GET /api/v1/groups/:id ─────────────────────────────────────
  app.get('/api/v1/groups/:id', requireAuth, requirePermission('groups:view'), (req, res) => {
    const group = repo.findById(req.params.id);
    if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
    return send(res, 200, OP_CODES.SUCCESS, { group });
  });

  // ── POST /api/v1/groups — crear ────────────────────────────────
  // Requiere: groups-add
  app.post('/api/v1/groups', requireAuth, requirePermission('groups:add'), (req, res) => {
    const { nombre, descripcion, nivel, actor, integrantes, tickets, estado } = req.body ?? {};
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return send(res, 400, OP_CODES.VALIDATION_ERROR, { message: 'El nombre del grupo es obligatorio (mínimo 2 caracteres)' });
    }
    const group = repo.create({ nombre: nombre.trim(), descripcion, nivel, actor, integrantes, tickets, estado });
    return send(res, 201, OP_CODES.SUCCESS, { group });
  });

  // ── PATCH /api/v1/groups/:id — editar ─────────────────────────
  // Requiere: groups-edit
  app.patch('/api/v1/groups/:id', requireAuth, requirePermission('groups:edit'), (req, res) => {
    const group = repo.findById(req.params.id);
    if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
    const allowed = ['nombre', 'descripcion', 'nivel', 'actor', 'integrantes', 'tickets', 'estado'];
    const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) changes[key] = req.body[key];
    }
    const updated = repo.update(req.params.id, changes);
    return send(res, 200, OP_CODES.SUCCESS, { group: updated });
  });

  // ── DELETE /api/v1/groups/:id ──────────────────────────────────
  // Requiere: groups-delete
  app.delete('/api/v1/groups/:id', requireAuth, requirePermission('groups:delete'), (req, res) => {
    const group = repo.findById(req.params.id);
    if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
    repo.delete(req.params.id);
    return send(res, 200, OP_CODES.SUCCESS, { message: 'Grupo eliminado' });
  });

  // ── GET /api/v1/groups/:id/members — listar miembros ──────────
  app.get('/api/v1/groups/:id/members', requireAuth, requirePermission('groups:view'), (req, res) => {
    const group = repo.findById(req.params.id);
    if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
    return send(res, 200, OP_CODES.SUCCESS, { members: repo.getMembers(req.params.id) });
  });

  // ── PUT /api/v1/groups/:id/members/:userId — asignar permisos ─
  // Requiere: groups-edit
  app.put('/api/v1/groups/:id/members/:userId', requireAuth, requirePermission('groups:edit'), (req, res) => {
    const group = repo.findById(req.params.id);
    if (!group) return send(res, 404, OP_CODES.GROUP_NOT_FOUND, { message: 'Grupo no encontrado' });
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
    repo.setMemberPermissions(req.params.id, req.params.userId, permissions);
    return send(res, 200, OP_CODES.SUCCESS, {
      userId: req.params.userId,
      groupId: req.params.id,
      permissions
    });
  });

  // ── DELETE /api/v1/groups/:id/members/:userId ──────────────────
  app.delete('/api/v1/groups/:id/members/:userId', requireAuth, requirePermission('groups:edit'), (req, res) => {
    repo.removeMember(req.params.id, req.params.userId);
    return send(res, 200, OP_CODES.SUCCESS, { message: 'Miembro removido' });
  });

  // Handler global de errores
  app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode ?? 500;
    return send(res, statusCode, OP_CODES.INTERNAL_ERROR, { message: err.message ?? 'Error interno' });
  });

  return app;
}

module.exports = { createApp };
