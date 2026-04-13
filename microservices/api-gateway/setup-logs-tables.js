/**
 * Script para crear tablas de logs y métricas en Supabase.
 * Uso: node setup-logs-tables.js
 * Requiere variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
require('./load-env');

const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BASE || !KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function insert(table, row) {
  const r = await fetch(`${BASE}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify([row])
  });
  return r.status;
}

async function tableExists(table) {
  const r = await fetch(`${BASE}/rest/v1/${table}?limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  return r.status !== 404;
}

async function main() {
  // Verificar si las tablas ya existen
  const logsExist = await tableExists('request_logs');
  const errExist  = await tableExists('error_logs');

  if (logsExist && errExist) {
    console.log('Tablas ya existen - OK');
    return;
  }

  console.log('Las tablas no existen todavía.');
  console.log('Por favor ejecuta este SQL en el editor SQL de Supabase:');
  console.log('');
  console.log(`
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
  `);
}

main().catch(console.error);
