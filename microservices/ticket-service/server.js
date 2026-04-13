const { buildApp } = require('./src/app');

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
