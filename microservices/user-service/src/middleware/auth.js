const { OP_CODES } = require('../http/op-codes');
const { send } = require('../http/response');
const { verifyJwt } = require('../lib/jwt');

function createAuthMiddleware(config) {
  function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return send(res, 401, OP_CODES.UNAUTHORIZED, { message: 'Token requerido' });
    }

    try {
      req.auth = verifyJwt(token, config.jwtSecret);
      return next();
    } catch (error) {
      return send(res, 401, OP_CODES.UNAUTHORIZED, { message: error.message });
    }
  }

  function requirePermissions(required, mode = 'all') {
    return (req, res, next) => {
      const granted = new Set(req.auth?.permissions || []);
      const ok = mode === 'any'
        ? required.some(permission => granted.has(permission))
        : required.every(permission => granted.has(permission));

      if (!ok) {
        return send(res, 403, OP_CODES.FORBIDDEN, {
          message: 'No cuentas con permisos suficientes',
          requiredPermissions: required
        });
      }

      return next();
    };
  }

  return { requireAuth, requirePermissions };
}

module.exports = { createAuthMiddleware };
