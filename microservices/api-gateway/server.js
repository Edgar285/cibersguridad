const { buildGateway } = require('./src/app');

async function start() {
  const app = await buildGateway();
  const port = Number(process.env.GATEWAY_PORT || 3000);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`[api-gateway] listening on http://localhost:${port}`);
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
