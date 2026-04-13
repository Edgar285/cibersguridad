function send(res, statusCode, intOpCode, data) {
  return res.status(statusCode).json({ statusCode, intOpCode, data });
}

module.exports = { send };
