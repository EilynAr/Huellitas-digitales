// Utilidades de autenticación para las pruebas: firman tokens JWT reales
// con el mismo secreto que usa middleware/auth.js (definido en tests/setup.js).

const jwt = require('jsonwebtoken');

const SECRETO = process.env.JWT_SECRET;
const USUARIO_TOKEN = { id_usuario: 6, id_tipo_usuario: 2 };

const tokenDe = (overrides = {}, opciones = { expiresIn: '1h' }) =>
  jwt.sign({ ...USUARIO_TOKEN, ...overrides }, SECRETO, opciones);

// Encabezado listo para supertest: .set(autorizacion())
const autorizacion = (overrides = {}) => ({
  Authorization: `Bearer ${tokenDe(overrides)}`
});

module.exports = { SECRETO, USUARIO_TOKEN, tokenDe, autorizacion };
