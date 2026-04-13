const jwt = require('jsonwebtoken');
const { send } = require('../http/response');
const { OP_CODES } = require('../http/op-codes');

function createAuthMiddleware(jwtSecret) {
  function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return send(res, 401, OP_CODES.UNAUTHORIZED, { message: 'Token requerido' });
    }
    try {
      req.user = jwt.verify(authHeader.slice(7), jwtSecret);
      return next();
    } catch {
      return send(res, 401, OP_CODES.UNAUTHORIZED, { message: 'Token inválido o expirado' });
    }
  }

  function requirePermission(permission) {
    return (req, res, next) => {
      const perms = req.user?.permissions ?? [];
      if (!perms.includes(permission)) {
        return send(res, 403, OP_CODES.FORBIDDEN, { message: `Permiso requerido: ${permission}` });
      }
      return next();
    };
  }

  return { requireAuth, requirePermission };
}

module.exports = { createAuthMiddleware };
