const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { createMemoryTicketRepository } = require('./repositories/memory-ticket-repository');
const { createAuthMiddleware } = require('./middleware/auth');
const { send } = require('./http/response');
const { OP_CODES } = require('./http/op-codes');

const VALID_STATUSES = ['pending', 'in_progress', 'review', 'done', 'blocked'];
const VALID_PRIORITIES = ['supremo', 'critico', 'alto', 'medio', 'bajo', 'muy_bajo', 'observacion'];

async function buildApp() {
  const jwtSecret = process.env.JWT_SECRET || 'changeme-secret';
  const repo = createMemoryTicketRepository();
  const { requireAuth, requirePermission } = createAuthMiddleware(jwtSecret);

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // ──────────────────────────────────────────────────────────────
  // Health
  // ──────────────────────────────────────────────────────────────
  app.get('/api/v1/tickets/health', async (_req, reply) => {
    return send(reply, 200, OP_CODES.SUCCESS, { service: 'ticket-service', status: 'ok' });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/tickets — listar por grupo
  // Requiere: ticket-view
  // ──────────────────────────────────────────────────────────────
  app.get('/api/v1/tickets', {
    preHandler: [requireAuth, requirePermission('tickets:view')]
  }, async (request, reply) => {
    const { groupId } = request.query;
    const tickets = groupId ? repo.findByGroup(groupId) : repo.findAll();
    return send(reply, 200, OP_CODES.SUCCESS, { tickets });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/tickets/:id — detalle
  // Requiere: ticket-view
  // ──────────────────────────────────────────────────────────────
  app.get('/api/v1/tickets/:id', {
    preHandler: [requireAuth, requirePermission('tickets:view')]
  }, async (request, reply) => {
    const ticket = repo.findById(request.params.id);
    if (!ticket) {
      return send(reply, 404, OP_CODES.TICKET_NOT_FOUND, { message: 'Ticket no encontrado' });
    }
    return send(reply, 200, OP_CODES.SUCCESS, { ticket });
  });

  // ──────────────────────────────────────────────────────────────
  // POST /api/v1/tickets — crear
  // Requiere: ticket-add
  // ──────────────────────────────────────────────────────────────
  app.post('/api/v1/tickets', {
    preHandler: [requireAuth, requirePermission('tickets:add')]
  }, async (request, reply) => {
    const { title, description, status, priority, groupId, assignedTo, dueDate } = request.body ?? {};

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return send(reply, 400, OP_CODES.VALIDATION_ERROR, { message: 'El título es obligatorio (mínimo 3 caracteres)' });
    }
    if (!groupId || typeof groupId !== 'string') {
      return send(reply, 400, OP_CODES.VALIDATION_ERROR, { message: 'groupId es obligatorio' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return send(reply, 400, OP_CODES.VALIDATION_ERROR, { message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return send(reply, 400, OP_CODES.VALIDATION_ERROR, { message: `Prioridad inválida. Valores permitidos: ${VALID_PRIORITIES.join(', ')}` });
    }

    const ticket = repo.create({
      title: title.trim(),
      description,
      status,
      priority,
      groupId,
      author: request.user.sub,
      assignedTo,
      dueDate
    });

    return send(reply, 201, OP_CODES.SUCCESS, { ticket });
  });

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/v1/tickets/:id — editar datos generales
  // Requiere: ticket-edit
  // ──────────────────────────────────────────────────────────────
  app.patch('/api/v1/tickets/:id', {
    preHandler: [requireAuth, requirePermission('tickets:edit')]
  }, async (request, reply) => {
    const ticket = repo.findById(request.params.id);
    if (!ticket) {
      return send(reply, 404, OP_CODES.TICKET_NOT_FOUND, { message: 'Ticket no encontrado' });
    }

    const allowed = ['title', 'description', 'priority', 'assignedTo', 'dueDate'];
    const changes = {};
    for (const key of allowed) {
      if (request.body[key] !== undefined) changes[key] = request.body[key];
    }

    const updated = repo.update(request.params.id, changes, request.user.sub);
    return send(reply, 200, OP_CODES.SUCCESS, { ticket: updated });
  });

  // ──────────────────────────────────────────────────────────────
  // PATCH /api/v1/tickets/:id/status — mover estado
  // Requiere: tickets:move Y que el ticket esté asignado al usuario
  // ──────────────────────────────────────────────────────────────
  app.patch('/api/v1/tickets/:id/status', {
    preHandler: [requireAuth, requirePermission('tickets:move')]
  }, async (request, reply) => {
    const ticket = repo.findById(request.params.id);
    if (!ticket) {
      return send(reply, 404, OP_CODES.TICKET_NOT_FOUND, { message: 'Ticket no encontrado' });
    }

    // Solo el usuario asignado puede mover el estado
    const userEmail = request.user.email;
    const isAdmin = (request.user.permissions ?? []).includes('tickets:edit');
    if (!isAdmin && ticket.assignedTo !== userEmail) {
      return send(reply, 403, OP_CODES.FORBIDDEN, {
        message: 'Solo el usuario asignado puede mover el estado del ticket'
      });
    }

    const { status } = request.body ?? {};
    if (!status || !VALID_STATUSES.includes(status)) {
      return send(reply, 400, OP_CODES.VALIDATION_ERROR, {
        message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`
      });
    }

    const updated = repo.update(request.params.id, { status }, request.user.sub);
    return send(reply, 200, OP_CODES.SUCCESS, { ticket: updated });
  });

  // ──────────────────────────────────────────────────────────────
  // DELETE /api/v1/tickets/:id
  // Requiere: ticket-delete
  // ──────────────────────────────────────────────────────────────
  app.delete('/api/v1/tickets/:id', {
    preHandler: [requireAuth, requirePermission('tickets:delete')]
  }, async (request, reply) => {
    const ticket = repo.findById(request.params.id);
    if (!ticket) {
      return send(reply, 404, OP_CODES.TICKET_NOT_FOUND, { message: 'Ticket no encontrado' });
    }
    repo.delete(request.params.id);
    return send(reply, 200, OP_CODES.SUCCESS, { message: 'Ticket eliminado' });
  });

  // Handler global de errores
  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    return send(reply, statusCode, OP_CODES.INTERNAL_ERROR, {
      message: error.message ?? 'Error interno del servidor'
    });
  });

  return app;
}

module.exports = { buildApp };
