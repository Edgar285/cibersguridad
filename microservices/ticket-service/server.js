const fs = require('fs');
const path = require('path');
const { buildApp } = require('./src/app');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

async function start() {
  const app = await buildApp();
  const port = Number(process.env.TICKET_SERVICE_PORT || 3002);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`[ticket-service] listening on http://localhost:${port}`);
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
