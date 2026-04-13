/**
 * Envía la respuesta con el esquema JSON universal.
 * { statusCode, intOpCode, data }
 */
function send(reply, statusCode, intOpCode, data) {
  return reply.status(statusCode).send({ statusCode, intOpCode, data });
}

module.exports = { send };
