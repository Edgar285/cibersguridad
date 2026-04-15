const Fastify = require('fastify');
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const jwt = require('jsonwebtoken');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Cargar .env del gateway ANTES de cualquier otro require que use process.env
(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const [k, ...v] = line.split('=');
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
  }
})();

const { ROUTES } = require('./routes');
const { initTables, logRequest, logError, getMetrics } = require('./logger');

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

  // Inicializar tablas de logs en Supabase
  await initTables();

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

  // ── Métricas centralizadas ────────────────────────────────────
  app.get('/metrics', async (_req, reply) => {
    const data = await getMetrics();
    return send(reply, 200, OP.SUCCESS, data);
  });

  // ── Proxy handler genérico ─────────────────────────────────────
  // OPTIONS lo maneja @fastify/cors, no lo registramos aquí
  const proxyMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
  app.route({ method: proxyMethods, url: '/*', handler: async (request, reply) => {
    const { method, url } = request;

    // Encontrar la regla que coincide (más específica primero)
    const rule = ROUTES.find(r => {
      const methodMatch = r.method === '*' || r.method === method;
      if (!methodMatch) return false;
      if (!url.startsWith(r.pathPrefix)) return false;
      // Si la ruta tiene pathSuffix, el URL debe terminar con ese sufijo
      if (r.pathSuffix) return url.endsWith(r.pathSuffix);
      return true;
    });

    if (!rule) {
      logRequest({ endpoint: url, method, userId: null, userEmail: null, ip: request.ip, statusCode: 404, responseTimeMs: 0 });
      return send(reply, 404, OP.NOT_FOUND, { message: `No route for ${method} ${url}` });
    }

    // Validar JWT si la ruta lo requiere
    let user = null;
    if (rule.auth) {
      const authHeader = request.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logRequest({ endpoint: url, method, userId: null, userEmail: null, ip: request.ip, statusCode: 401, responseTimeMs: 0 });
        return send(reply, 401, OP.UNAUTHORIZED, { message: 'Token requerido' });
      }
      try {
        user = jwt.verify(authHeader.slice(7), jwtSecret);
      } catch {
        logRequest({ endpoint: url, method, userId: null, userEmail: null, ip: request.ip, statusCode: 401, responseTimeMs: 0 });
        return send(reply, 401, OP.UNAUTHORIZED, { message: 'Token inválido o expirado' });
      }
    }

    // Verificar permiso
    if (rule.permission) {
      const perms = user?.permissions ?? [];
      if (!perms.includes(rule.permission)) {
        logRequest({ endpoint: url, method, userId: user?.sub, userEmail: user?.email, ip: request.ip, statusCode: 403, responseTimeMs: 0 });
        return send(reply, 403, OP.FORBIDDEN, {
          message: `Permiso requerido: ${rule.permission}`
        });
      }
    }

    // Reenviar al microservicio con timing para logs
    const startTime = Date.now();
    const upstreamBase = upstreams[rule.upstream];
    const result = await proxyRequest(request, reply, upstreamBase);
    const responseTimeMs = Date.now() - startTime;

    logRequest({
      endpoint: url,
      method,
      userId: user?.sub || null,
      userEmail: user?.email || null,
      ip: request.ip,
      statusCode: reply.statusCode,
      responseTimeMs
    });

    return result;
  }});

  app.setErrorHandler((error, req, reply) => {
    const statusCode = error.statusCode ?? 500;
    logError({
      endpoint: req.url || '/',
      method: req.method || 'GET',
      userId: null,
      ip: req.ip,
      errorMessage: error.message ?? 'Error interno',
      stackTrace: error.stack || null
    });
    return send(reply, statusCode, OP.INTERNAL, { message: error.message ?? 'Error interno' });
  });

  return app;
}

module.exports = { buildGateway };
