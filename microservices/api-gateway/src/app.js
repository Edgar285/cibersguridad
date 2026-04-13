const Fastify = require('fastify');
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
const { ROUTES } = require('./routes');

function send(reply, statusCode, intOpCode, data) {
  return reply.status(statusCode).send({ statusCode, intOpCode, data });
}

const OP = {
  SUCCESS: 0,
  UNAUTHORIZED: 4001,
  FORBIDDEN: 4003,
  NOT_FOUND: 4004,
  RATE_LIMITED: 4029,
  INTERNAL: 4500
};

/**
 * Reenvía el request al microservicio upstream y devuelve la respuesta.
 */
async function proxyRequest(request, reply, upstreamBase) {
  return new Promise((resolve) => {
    const url = new URL(upstreamBase + request.url);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const body = request.body ? JSON.stringify(request.body) : undefined;

    const headers = { ...request.headers };
    headers['host'] = url.host;
    if (body) headers['content-length'] = Buffer.byteLength(body).toString();

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: request.method,
      headers
    };

    const proxyReq = lib.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        reply.status(proxyRes.statusCode);
        // Copiar headers relevantes
        const fwdHeaders = ['content-type', 'cache-control'];
        for (const h of fwdHeaders) {
          if (proxyRes.headers[h]) reply.header(h, proxyRes.headers[h]);
        }
        try {
          resolve(reply.send(JSON.parse(data)));
        } catch {
          resolve(reply.send(data));
        }
      });
    });

    proxyReq.on('error', (err) => {
      resolve(send(reply, 502, OP.INTERNAL, { message: `Upstream error: ${err.message}` }));
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
}

async function buildGateway() {
  const jwtSecret = process.env.JWT_SECRET || 'changeme-secret';

  const upstreams = {
    USER_SERVICE:   process.env.USER_SERVICE_URL   || 'http://localhost:3001',
    TICKET_SERVICE: process.env.TICKET_SERVICE_URL || 'http://localhost:3002',
    GROUP_SERVICE:  process.env.GROUP_SERVICE_URL  || 'http://localhost:3003'
  };

  const app = Fastify({ logger: true });

  // ── CORS ──────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // ── Rate limiting: 100 req/min por IP ────────────────────────
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 100),
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      intOpCode: OP.RATE_LIMITED,
      data: {
        message: 'Too many requests',
        retryAfter: Math.ceil(context.ttl / 1000)
      }
    })
  });

  // ── Health del gateway ────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    return send(reply, 200, OP.SUCCESS, { service: 'api-gateway', status: 'ok' });
  });

  // ── Proxy handler genérico ─────────────────────────────────────
  // OPTIONS lo maneja @fastify/cors, no lo registramos aquí
  const proxyMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
  app.route({ method: proxyMethods, url: '/*', handler: async (request, reply) => {
    const { method, url } = request;

    // Encontrar la regla que coincide
    const rule = ROUTES.find(r => {
      const methodMatch = r.method === '*' || r.method === method;
      const pathMatch = url.startsWith(r.pathPrefix);
      return methodMatch && pathMatch;
    });

    if (!rule) {
      return send(reply, 404, OP.NOT_FOUND, { message: `No route for ${method} ${url}` });
    }

    // Validar JWT si la ruta lo requiere
    let user = null;
    if (rule.auth) {
      const authHeader = request.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return send(reply, 401, OP.UNAUTHORIZED, { message: 'Token requerido' });
      }
      try {
        user = jwt.verify(authHeader.slice(7), jwtSecret);
      } catch {
        return send(reply, 401, OP.UNAUTHORIZED, { message: 'Token inválido o expirado' });
      }
    }

    // Verificar permiso
    if (rule.permission) {
      const perms = user?.permissions ?? [];
      if (!perms.includes(rule.permission)) {
        return send(reply, 403, OP.FORBIDDEN, {
          message: `Permiso requerido: ${rule.permission}`
        });
      }
    }

    // Reenviar al microservicio
    const upstreamBase = upstreams[rule.upstream];
    return proxyRequest(request, reply, upstreamBase);
  }});

  app.setErrorHandler((error, _req, reply) => {
    const statusCode = error.statusCode ?? 500;
    return send(reply, statusCode, OP.INTERNAL, { message: error.message ?? 'Error interno' });
  });

  return app;
}

module.exports = { buildGateway };
