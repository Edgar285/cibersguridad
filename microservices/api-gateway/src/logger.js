/**
 * logger.js — logs centralizados y métricas en Supabase.
 * Fire-and-forget: nunca bloquea el request principal.
 * Las variables de entorno se leen dinámicamente para dar tiempo al loadEnv().
 */

const TABLES_READY = { request_logs: false, error_logs: false };

function getConfig() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

function getHeaders() {
  const { key } = getConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function sbInsert(table, row) {
  const { url, key } = getConfig();
  if (!url || !key) return;
  try {
    const r = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify([row])
    });
    if (r.status === 404 || r.status === 400) {
      const body = await r.text();
      if (body.includes('does not exist') || body.includes('relation')) {
        TABLES_READY[table] = false;
      }
    } else {
      TABLES_READY[table] = true;
    }
  } catch (_) {
    // fire-and-forget: ignorar errores de red
  }
}

// ── Inicialización: verifica tablas al arrancar ───────────────────────────────
async function initTables() {
  const { url, key } = getConfig();
  if (!url || !key) {
    console.warn('[logger] SUPABASE_URL/KEY no configurados — logs desactivados');
    return;
  }

  const check = async (table) => {
    const r = await fetch(`${url}/rest/v1/${table}?limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    return r.status !== 404;
  };

  const [logsOk, errOk] = await Promise.all([
    check('request_logs').catch(() => false),
    check('error_logs').catch(() => false)
  ]);

  if (!logsOk || !errOk) {
    console.error('\n[logger] ⚠️  Las tablas de logs no existen en Supabase.');
    console.error('[logger] Ejecuta este SQL en el editor SQL de Supabase (https://supabase.com/dashboard):');
    console.error(`\n------- SQL -------
CREATE TABLE IF NOT EXISTS request_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint         text        NOT NULL,
  method           varchar(10) NOT NULL,
  user_id          text,
  user_email       text,
  ip               text,
  status_code      int,
  response_time_ms int,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS error_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      text        NOT NULL,
  method        varchar(10) NOT NULL,
  user_id       text,
  ip            text,
  error_message text,
  stack_trace   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-------------------\n`);
  } else {
    TABLES_READY.request_logs = true;
    TABLES_READY.error_logs   = true;
    console.log('[logger] Tablas de logs OK ✓');
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Registra un request completado.
 */
function logRequest({ endpoint, method, userId, userEmail, ip, statusCode, responseTimeMs }) {
  setImmediate(() => sbInsert('request_logs', {
    endpoint,
    method: method.toUpperCase(),
    user_id: userId || null,
    user_email: userEmail || null,
    ip: ip || null,
    status_code: statusCode,
    response_time_ms: responseTimeMs
  }));
}

/**
 * Registra un error.
 */
function logError({ endpoint, method, userId, ip, errorMessage, stackTrace }) {
  setImmediate(() => sbInsert('error_logs', {
    endpoint,
    method: method.toUpperCase(),
    user_id: userId || null,
    ip: ip || null,
    error_message: errorMessage || 'Unknown error',
    stack_trace: stackTrace || null
  }));
}

/**
 * Obtiene métricas agregadas directamente de Supabase.
 */
async function getMetrics() {
  const { url, key } = getConfig();
  if (!url || !key || !TABLES_READY.request_logs) {
    return { error: 'Tablas de logs no disponibles' };
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    // Total de requests
    const totalR = await fetch(
      `${url}/rest/v1/request_logs?select=id`,
      { headers: { ...headers, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' } }
    );
    const total = parseInt(totalR.headers.get('content-range')?.split('/')[1] || '0', 10);

    // Requests por endpoint (top 10 más usados)
    const byEndpointR = await fetch(
      `${url}/rest/v1/request_logs?select=endpoint,method&limit=1000&order=created_at.desc`,
      { headers }
    );
    const rows = byEndpointR.ok ? await byEndpointR.json() : [];

    const endpointMap = {};
    for (const r of rows) {
      const k = `${r.method} ${r.endpoint}`;
      endpointMap[k] = (endpointMap[k] || 0) + 1;
    }
    const byEndpoint = Object.entries(endpointMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // Tiempo de respuesta promedio
    const avgR = await fetch(
      `${url}/rest/v1/request_logs?select=response_time_ms&limit=1000&order=created_at.desc`,
      { headers }
    );
    const timeRows = avgR.ok ? await avgR.json() : [];
    const times = timeRows.map(r => r.response_time_ms).filter(t => t != null);
    const avgResponseTime = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

    // Requests en últimas 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24R = await fetch(
      `${url}/rest/v1/request_logs?select=id&created_at=gte.${since}`,
      { headers: { ...headers, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' } }
    );
    const last24h = parseInt(last24R.headers.get('content-range')?.split('/')[1] || '0', 10);

    // Errores recientes
    const errorsR = await fetch(
      `${url}/rest/v1/error_logs?select=endpoint,method,error_message,created_at&order=created_at.desc&limit=5`,
      { headers }
    );
    const recentErrors = errorsR.ok ? await errorsR.json() : [];

    return {
      total_requests: total,
      requests_last_24h: last24h,
      avg_response_time_ms: avgResponseTime,
      top_endpoints: byEndpoint,
      recent_errors: recentErrors
    };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { initTables, logRequest, logError, getMetrics };
