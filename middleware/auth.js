const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'clave-de-desarrollo-cambiar';

// Genera un token que vale 8 horas
function firmarToken(usuario) {
  return jwt.sign(
    { id_usuario: Number(usuario.id_usuario), id_tipo_usuario: usuario.id_tipo_usuario },
    SECRET,
    { expiresIn: '8h' }
  );
}

// Exige el encabezado Authorization: Bearer <token>
function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión.' });
  }

  try {
    req.usuario = jwt.verify(token, SECRET); // { id_usuario, id_tipo_usuario, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o vencida. Vuelve a iniciar sesión.' });
  }
}

module.exports = { firmarToken, verificarToken };