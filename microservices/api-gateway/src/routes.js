/**
 * Mapa de rutas del gateway.
 *
 * Cada entrada define:
 *  - method:     método HTTP (o '*' para cualquiera)
 *  - pathPrefix: prefijo que debe coincidir con request.url
 *  - upstream:   URL base del microservicio destino
 *  - auth:       ¿requiere JWT?
 *  - permission: permiso requerido (string). Vacío = solo requiere auth.
 */
const ROUTES = [
  // ── Users / Auth (sin permisos previos) ──────────────────────
  { method: 'POST', pathPrefix: '/api/v1/users/auth/login',    upstream: 'USER_SERVICE',   auth: false, permission: null },
  { method: 'POST', pathPrefix: '/api/v1/users/auth/register', upstream: 'USER_SERVICE',   auth: false, permission: null },

  // ── Users (con auth) ─────────────────────────────────────────
  { method: '*',    pathPrefix: '/api/v1/users/profile',       upstream: 'USER_SERVICE',   auth: true,  permission: null },
  { method: '*',    pathPrefix: '/api/v1/users/admin',         upstream: 'USER_SERVICE',   auth: true,  permission: 'users:view' },
  { method: 'GET',  pathPrefix: '/api/v1/users',               upstream: 'USER_SERVICE',   auth: true,  permission: null },

  // ── Tickets ───────────────────────────────────────────────────
  { method: 'POST',  pathPrefix: '/api/v1/tickets',                   upstream: 'TICKET_SERVICE', auth: true, permission: 'tickets:add' },
  { method: 'POST',  pathPrefix: '/api/v1/tickets/',                  upstream: 'TICKET_SERVICE', auth: true, permission: 'tickets:view',
    pathSuffix: '/comments' },
  { method: 'PATCH', pathPrefix: '/api/v1/tickets/',                  upstream: 'TICKET_SERVICE', auth: true, permission: 'tickets:move',
    pathSuffix: '/status' },
  { method: 'PATCH', pathPrefix: '/api/v1/tickets',                   upstream: 'TICKET_SERVICE', auth: true, permission: 'tickets:edit' },
  { method: 'DELETE',pathPrefix: '/api/v1/tickets',                   upstream: 'TICKET_SERVICE', auth: true, permission: 'tickets:delete' },
  { method: 'GET',   pathPrefix: '/api/v1/tickets',                   upstream: 'TICKET_SERVICE', auth: true, permission: 'tickets:view' },

  // ── Groups ────────────────────────────────────────────────────
  { method: 'POST',  pathPrefix: '/api/v1/groups',             upstream: 'GROUP_SERVICE',  auth: true, permission: 'groups:add' },
  { method: 'PATCH', pathPrefix: '/api/v1/groups',             upstream: 'GROUP_SERVICE',  auth: true, permission: 'groups:edit' },
  { method: 'DELETE',pathPrefix: '/api/v1/groups',             upstream: 'GROUP_SERVICE',  auth: true, permission: 'groups:delete' },
  { method: 'PUT',   pathPrefix: '/api/v1/groups',             upstream: 'GROUP_SERVICE',  auth: true, permission: 'groups:edit' },
  { method: 'GET',   pathPrefix: '/api/v1/groups',             upstream: 'GROUP_SERVICE',  auth: true, permission: 'groups:view' }
];

module.exports = { ROUTES };
