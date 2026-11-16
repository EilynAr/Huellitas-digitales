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
/**
 * @openapi
 * /api/usuarios/registro:
 *   post:
 *     tags: [Usuarios]
 *     summary: Registra un usuario nuevo
 *     description: Encripta la contrasena con bcrypt y devuelve el usuario con un token listo para usar. El tipo de usuario siempre es 2 (Usuario), nunca se toma del cuerpo.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, correo, contrasena]
 *             properties:
 *               nombre: { type: string, example: María }
 *               apellido: { type: string, example: Pérez }
 *               correo: { type: string, format: email, example: maria.perez@correo.com }
 *               contrasena: { type: string, format: password, example: '123456' }
 *     responses:
 *       201:
 *         description: Usuario creado (sin el campo contrasena) y token emitido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Sesion' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/usuarios/login:
 *   post:
 *     tags: [Usuarios]
 *     summary: Inicia sesión y emite un JWT
 *     description: Compara la contrasena con el hash guardado (bcrypt). Responde el mismo mensaje para correo inexistente y contrasena incorrecta, para no filtrar que correos existen.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, contrasena]
 *             properties:
 *               correo: { type: string, format: email, example: eilyn.angarita@correo.com }
 *               contrasena: { type: string, format: password, example: '123456' }
 *     responses:
 *       200:
 *         description: Credenciales válidas y token emitido (válido 8 horas)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Sesion' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/usuarios/{id_usuario}/mascotas:
 *   get:
 *     tags: [Usuarios]
 *     summary: Mascotas del usuario autenticado
 *     description: Cada mascota incluye el arreglo Cuidados (alias que Sequelize genera para el include) ordenado por fecha descendente. Solo se puede consultar el propio usuario.
 *     parameters:
 *       - in: path
 *         name: id_usuario
 *         required: true
 *         schema: { type: integer, example: 6 }
 *     responses:
 *       200:
 *         description: Lista de mascotas con su historial
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Mascota'
 *                   - type: object
 *                     properties:
 *                       Cuidados:
 *                         type: array
 *                         items: { $ref: '#/components/schemas/Cuidado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/usuarios/{id_usuario}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Perfil del usuario autenticado
 *     description: Devuelve el usuario sin el campo contrasena. Solo se puede consultar el propio usuario.
 *     parameters:
 *       - in: path
 *         name: id_usuario
 *         required: true
 *         schema: { type: integer, example: 6 }
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/mascotas:
 *   post:
 *     tags: [Mascotas]
 *     summary: Registra una mascota del usuario autenticado
 *     description: El dueño se toma del token, no del cuerpo de la peticion.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, sexo, id_tipo_mascota]
 *             properties:
 *               nombre: { type: string, example: Luna }
 *               raza: { type: string, example: Golden Retriever }
 *               sexo: { type: string, enum: [H, M], example: H }
 *               fecha_nacimiento: { type: string, format: date, example: '2021-03-12' }
 *               color: { type: string, example: Dorado }
 *               peso: { type: number, example: 28.5 }
 *               foto: { type: string, example: 'https://ejemplo.com/luna.jpg' }
 *               id_tipo_mascota: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Mascota registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje: { type: string, example: Mascota registrada con éxito }
 *                 mascota: { $ref: '#/components/schemas/Mascota' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/mascotas/{id_mascota}/cuidados:
 *   get:
 *     tags: [Mascotas]
 *     summary: Historial de cuidados de una mascota propia
 *     parameters:
 *       - in: path
 *         name: id_mascota
 *         required: true
 *         schema: { type: integer, example: 11 }
 *     responses:
 *       200:
 *         description: Historial ordenado por fecha descendente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mascota: { type: string, example: Molly }
 *                 total_cuidados: { type: integer, example: 1 }
 *                 historial:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Cuidado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/mascotas/{id_mascota}:
 *   put:
 *     tags: [Mascotas]
 *     summary: Actualiza una mascota propia
 *     description: Se ignoran id_usuario e id_mascota si vienen en el cuerpo; el dueño no se puede cambiar.
 *     parameters:
 *       - in: path
 *         name: id_mascota
 *         required: true
 *         schema: { type: integer, example: 11 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string, example: Molly }
 *               raza: { type: string, example: Siames }
 *               sexo: { type: string, enum: [H, M], example: H }
 *               fecha_nacimiento: { type: string, format: date, example: '2023-05-25' }
 *               color: { type: string, example: Blanco con gris }
 *               peso: { type: number, example: 9.4 }
 *               foto: { type: string, example: 'https://ejemplo.com/molly.jpg' }
 *               id_tipo_mascota: { type: integer, example: 2 }
 *     responses:
 *       200:
 *         description: Mascota actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje: { type: string, example: Mascota actualizada con éxito }
 *                 mascota: { $ref: '#/components/schemas/Mascota' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/mascotas/{id_mascota}:
 *   delete:
 *     tags: [Mascotas]
 *     summary: Elimina una mascota propia
 *     description: Sus cuidados se eliminan en cascada (ON DELETE CASCADE).
 *     parameters:
 *       - in: path
 *         name: id_mascota
 *         required: true
 *         schema: { type: integer, example: 11 }
 *     responses:
 *       200:
 *         description: Mascota eliminada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Mensaje' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/cuidados:
 *   post:
 *     tags: [Cuidados]
 *     summary: Registra un cuidado (vacuna o baño)
 *     description: La mascota debe pertenecer al usuario del token. Si se envia proxima_fecha, debe ser mayor o igual a fecha.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_mascota, tipo_cuidado, fecha, detalle]
 *             properties:
 *               id_mascota: { type: integer, example: 11 }
 *               tipo_cuidado: { type: string, enum: [Vacuna, Baño], example: Vacuna }
 *               fecha: { type: string, format: date, example: '2026-11-13' }
 *               detalle: { type: string, example: Refuerzo de rabia }
 *               proxima_fecha: { type: string, format: date, example: '2027-11-13' }
 *               responsable: { type: string, example: Dra. Gómez }
 *               observaciones: { type: string, example: Sin reacciones adversas }
 *     responses:
 *       201:
 *         description: Cuidado registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje: { type: string, example: Registro de cuidado agregado con éxito }
 *                 cuidado: { $ref: '#/components/schemas/Cuidado' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/cuidados/{id_cuidado}:
 *   put:
 *     tags: [Cuidados]
 *     summary: Reemplaza un cuidado propio
 *     description: Se ignora id_mascota si viene en el cuerpo; el cuidado no se puede mover a otra mascota.
 *     parameters:
 *       - in: path
 *         name: id_cuidado
 *         required: true
 *         schema: { type: integer, example: 13 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipo_cuidado: { type: string, enum: [Vacuna, Baño], example: Vacuna }
 *               fecha: { type: string, format: date, example: '2026-11-13' }
 *               detalle: { type: string, example: Refuerzo anual de rabia }
 *               proxima_fecha: { type: string, format: date, example: '2027-11-13' }
 *               responsable: { type: string, example: Dra. Gómez }
 *               observaciones: { type: string, example: Sin reacciones }
 *     responses:
 *       200:
 *         description: Cuidado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje: { type: string, example: Cuidado actualizado con éxito }
 *                 cuidado: { $ref: '#/components/schemas/Cuidado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/cuidados/{id_cuidado}:
 *   patch:
 *     tags: [Cuidados]
 *     summary: Actualiza campos parciales de un cuidado propio
 *     parameters:
 *       - in: path
 *         name: id_cuidado
 *         required: true
 *         schema: { type: integer, example: 13 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               detalle: { type: string, example: Refuerzo anual de rabia }
 *               responsable: { type: string, example: Dra. Gómez }
 *               observaciones: { type: string, example: Sin reacciones adversas }
 *               proxima_fecha: { type: string, format: date, example: '2027-01-15' }
 *     responses:
 *       200:
 *         description: Cuidado actualizado parcialmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje: { type: string, example: Cuidado actualizado parcialmente con PATCH }
 *                 cuidado: { $ref: '#/components/schemas/Cuidado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/cuidados/{id_cuidado}:
 *   delete:
 *     tags: [Cuidados]
 *     summary: Elimina un cuidado propio
 *     parameters:
 *       - in: path
 *         name: id_cuidado
 *         required: true
 *         schema: { type: integer, example: 13 }
 *     responses:
 *       200:
 *         description: Cuidado eliminado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Mensaje' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
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
/**
 * @openapi
 * /api/tipos-mascota:
 *   get:
 *     tags: [Catálogos]
 *     summary: Lista los tipos de mascota
 *     security: []
 *     responses:
 *       200:
 *         description: Catálogo completo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/TipoMascota' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.get('/tipos-mascota', async (req, res) => {
  try {
    const tipos = await TipoMascota.findAll();
    res.status(200).json(tipos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener tipos de mascota', detalle: error.message });
  }
});

// GET /api/tipos-usuario
/**
 * @openapi
 * /api/tipos-usuario:
 *   get:
 *     tags: [Catálogos]
 *     summary: Lista los tipos de usuario
 *     security: []
 *     responses:
 *       200:
 *         description: Catálogo completo (1 = Administrador, 2 = Usuario)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/TipoUsuario' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
router.get('/tipos-usuario', async (req, res) => {
  try {
    const tipos = await TipoUsuario.findAll();
    res.status(200).json(tipos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener tipos de usuario', detalle: error.message });
  }
});

module.exports = router;