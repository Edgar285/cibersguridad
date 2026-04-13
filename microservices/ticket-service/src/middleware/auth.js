const jwt = require('jsonwebtoken');
const { send } = require('../http/response');
const { OP_CODES } = require('../http/op-codes');

function createAuthMiddleware(jwtSecret) {
  /**
   * Hook de Fastify: valida el JWT en Authorization: Bearer <token>
   * Adjunta los datos del usuario en request.user
   */
  async function requireAuth(request, reply) {
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return send(reply, 401, OP_CODES.UNAUTHORIZED, { message: 'Token requerido' });
    }

    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, jwtSecret);
      request.user = decoded;
    } catch {
      return send(reply, 401, OP_CODES.UNAUTHORIZED, { message: 'Token inválido o expirado' });
    }
  }

  /**
   * Verifica que el usuario tenga el permiso requerido.
   * @param {string} permission
   */
  function requirePermission(permission) {
    return async function (request, reply) {
      const perms = request.user?.permissions ?? [];
      if (!perms.includes(permission)) {
        return send(reply, 403, OP_CODES.FORBIDDEN, { message: `Permiso requerido: ${permission}` });
      }
    };
  }

  return { requireAuth, requirePermission };
}

module.exports = { createAuthMiddleware };
