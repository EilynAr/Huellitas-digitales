const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const Usuario = require('../models/Usuario');
const Mascota = require('../models/Mascota');
const Cuidado = require('../models/Cuidado');
const TipoUsuario = require('../models/TipoUsuario');
const TipoMascota = require('../models/TipoMascota');
const { firmarToken, verificarToken } = require('../middleware/auth');

// Devuelve la mascota solo si pertenece al usuario autenticado; si no, null
async function mascotaDelUsuario(idMascota, idUsuario) {
  const mascota = await Mascota.findByPk(idMascota);
  if (!mascota || Number(mascota.id_usuario) !== Number(idUsuario)) return null;
  return mascota;
}

// Devuelve el cuidado solo si su mascota pertenece al usuario autenticado; si no, null
async function cuidadoDelUsuario(idCuidado, idUsuario) {
  const cuidado = await Cuidado.findByPk(idCuidado);
  if (!cuidado) return null;
  const mascota = await mascotaDelUsuario(cuidado.id_mascota, idUsuario);
  return mascota ? cuidado : null;
}

// ==========================================
// USUARIOS (PÚBLICO)
// ==========================================

// POST /api/usuarios/registro
router.post('/usuarios/registro', async (req, res) => {
  try {
    const { nombre, apellido, correo, contrasena } = req.body;

    if (!nombre || !apellido || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, apellido, correo y contrasena son obligatorios.' });
    }

    const existe = await Usuario.findOne({ where: { correo } });
    if (existe) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    // El tipo siempre es 2 (Usuario): el cliente no puede elegir otro rol
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      correo,
      contrasena: contrasenaEncriptada,
      id_tipo_usuario: 2
    });

    const { contrasena: _, ...usuarioData } = nuevoUsuario.toJSON();
    res.status(201).json({
      mensaje: 'Usuario creado con éxito',
      usuario: usuarioData,
      token: firmarToken(usuarioData)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor', detalle: error.message });
  }
});

// POST /api/usuarios/login
router.post('/usuarios/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    const usuario = await Usuario.findOne({ where: { correo } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const contrasenaValida = await bcrypt.compare(String(contrasena ?? ''), usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const { contrasena: _, ...usuarioData } = usuario.toJSON();
    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuarioData,
      token: firmarToken(usuarioData)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
});

// ==========================================
// USUARIOS (PROTEGIDO: solo el propio usuario)
// ==========================================

// GET /api/usuarios/:id_usuario/mascotas
router.get('/usuarios/:id_usuario/mascotas', verificarToken, async (req, res) => {
  try {
    if (Number(req.params.id_usuario) !== req.usuario.id_usuario) {
      return res.status(403).json({ error: 'No puedes ver las mascotas de otro usuario.' });
    }

    const mascotas = await Mascota.findAll({
      where: { id_usuario: req.usuario.id_usuario },
      include: [{ model: Cuidado, order: [['fecha', 'DESC']] }]
    });

    // El frontend trata el 404 como lista vacía
    if (mascotas.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron mascotas registradas para este usuario.' });
    }

    res.json(mascotas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las mascotas', detalle: error.message });
  }
});

// GET /api/usuarios/:id_usuario
router.get('/usuarios/:id_usuario', verificarToken, async (req, res) => {
  try {
    if (Number(req.params.id_usuario) !== req.usuario.id_usuario) {
      return res.status(403).json({ error: 'No puedes ver el perfil de otro usuario.' });
    }

    const usuario = await Usuario.findByPk(req.usuario.id_usuario, {
      attributes: { exclude: ['contrasena'] }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil del usuario', detalle: error.message });
  }
});

// ==========================================
// MASCOTAS (PROTEGIDO)
// ==========================================

// POST /api/mascotas
router.post('/mascotas', verificarToken, async (req, res) => {
  try {
    const { nombre, raza, sexo, fecha_nacimiento, color, peso, foto, id_tipo_mascota } = req.body;

    if (!nombre || !sexo || !id_tipo_mascota) {
      return res.status(400).json({ error: 'Los campos nombre, sexo e id_tipo_mascota son obligatorios.' });
    }

    // El dueño sale del token, nunca del cuerpo de la petición
    const nuevaMascota = await Mascota.create({
      nombre,
      raza,
      sexo,
      fecha_nacimiento,
      color,
      peso,
      foto,
      id_tipo_mascota,
      id_usuario: req.usuario.id_usuario
    });

    res.status(201).json({ mensaje: 'Mascota registrada con éxito', mascota: nuevaMascota });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar la mascota', detalle: error.message });
  }
});

// GET /api/mascotas/:id_mascota/cuidados
router.get('/mascotas/:id_mascota/cuidados', verificarToken, async (req, res) => {
  try {
    const mascota = await mascotaDelUsuario(req.params.id_mascota, req.usuario.id_usuario);
    if (!mascota) {
      return res.status(404).json({ error: 'La mascota especificada no existe.' });
    }

    const historial = await Cuidado.findAll({
      where: { id_mascota: mascota.id_mascota },
      order: [['fecha', 'DESC']]
    });

    res.json({
      mascota: mascota.nombre,
      total_cuidados: historial.length,
      historial
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial de cuidados', detalle: error.message });
  }
});

// PUT /api/mascotas/:id_mascota
router.put('/mascotas/:id_mascota', verificarToken, async (req, res) => {
  try {
    const mascota = await mascotaDelUsuario(req.params.id_mascota, req.usuario.id_usuario);
    if (!mascota) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    // No se permite cambiar el dueño de la mascota
    const { id_usuario, id_mascota, ...campos } = req.body;
    await mascota.update(campos);

    res.json({ mensaje: 'Mascota actualizada con éxito', mascota });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la mascota', detalle: error.message });
  }
});

// DELETE /api/mascotas/:id_mascota
router.delete('/mascotas/:id_mascota', verificarToken, async (req, res) => {
  try {
    const mascota = await mascotaDelUsuario(req.params.id_mascota, req.usuario.id_usuario);
    if (!mascota) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    await mascota.destroy(); // Sus cuidados se eliminan por ON DELETE CASCADE
    res.json({ mensaje: 'Mascota eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la mascota', detalle: error.message });
  }
});

// ==========================================
// CUIDADOS (PROTEGIDO)
// ==========================================

// POST /api/cuidados
router.post('/cuidados', verificarToken, async (req, res) => {
  try {
    const { id_mascota, tipo_cuidado, fecha, detalle, proxima_fecha, responsable, observaciones } = req.body;

    if (!id_mascota || !tipo_cuidado || !fecha || !detalle) {
      return res.status(400).json({ error: 'Los campos id_mascota, tipo_cuidado, fecha y detalle son obligatorios.' });
    }

    // La mascota debe ser del usuario autenticado
    const mascota = await mascotaDelUsuario(id_mascota, req.usuario.id_usuario);
    if (!mascota) {
      return res.status(404).json({ error: 'La mascota especificada no existe.' });
    }

    if (proxima_fecha && new Date(proxima_fecha) < new Date(fecha)) {
      return res.status(400).json({ error: 'La próxima fecha debe ser mayor o igual a la fecha del cuidado actual.' });
    }

    const nuevoCuidado = await Cuidado.create({
      id_mascota: mascota.id_mascota,
      tipo_cuidado,
      fecha,
      detalle,
      proxima_fecha,
      responsable,
      observaciones
    });

    res.status(201).json({ mensaje: 'Registro de cuidado agregado con éxito', cuidado: nuevoCuidado });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el cuidado', detalle: error.message });
  }
});

// PUT /api/cuidados/:id_cuidado
router.put('/cuidados/:id_cuidado', verificarToken, async (req, res) => {
  try {
    const cuidado = await cuidadoDelUsuario(req.params.id_cuidado, req.usuario.id_usuario);
    if (!cuidado) {
      return res.status(404).json({ error: 'Registro de cuidado no encontrado.' });
    }

    const { id_mascota, ...campos } = req.body;
    await cuidado.update(campos);

    res.json({ mensaje: 'Cuidado actualizado con éxito', cuidado });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el cuidado', detalle: error.message });
  }
});

// PATCH /api/cuidados/:id_cuidado
router.patch('/cuidados/:id_cuidado', verificarToken, async (req, res) => {
  try {
    const cuidado = await cuidadoDelUsuario(req.params.id_cuidado, req.usuario.id_usuario);
    if (!cuidado) {
      return res.status(404).json({ error: 'Registro de cuidado no encontrado.' });
    }

    const { id_mascota, ...campos } = req.body;
    await cuidado.update(campos);

    res.json({ mensaje: 'Cuidado actualizado parcialmente con PATCH', cuidado });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar parcialmente', detalle: error.message });
  }
});

// DELETE /api/cuidados/:id_cuidado
router.delete('/cuidados/:id_cuidado', verificarToken, async (req, res) => {
  try {
    const cuidado = await cuidadoDelUsuario(req.params.id_cuidado, req.usuario.id_usuario);
    if (!cuidado) {
      return res.status(404).json({ error: 'Registro de cuidado no encontrado.' });
    }

    await cuidado.destroy();
    res.json({ mensaje: 'Cuidado eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el cuidado', detalle: error.message });
  }
});

// ==========================================
// CATÁLOGOS (PÚBLICO)
// ==========================================

// GET /api/tipos-mascota
router.get('/tipos-mascota', async (req, res) => {
  try {
    const tipos = await TipoMascota.findAll();
    res.status(200).json(tipos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener tipos de mascota', detalle: error.message });
  }
});

// GET /api/tipos-usuario
router.get('/tipos-usuario', async (req, res) => {
  try {
    const tipos = await TipoUsuario.findAll();
    res.status(200).json(tipos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener tipos de usuario', detalle: error.message });
  }
});

module.exports = router;