const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// Importar modelos
const Usuario = require('../models/Usuario');
const Mascota = require('../models/Mascota');
const Cuidado = require('../models/Cuidado');
const TipoUsuario = require('../models/TipoUsuario');
const TipoMascota = require('../models/TipoMascota');

// 1. ENDPOINT: Crear Usuario (Registro)
// POST /api/usuarios/registro
router.post('/usuarios/registro', async (req, res) => {
  try {
    const { nombre, apellido, correo, contrasena, id_tipo_usuario } = req.body;

    // Verificar si el correo ya existe
    const existe = await Usuario.findOne({ where: { correo } });
    if (existe) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Encriptar la contraseña de forma segura
    const salt = await bcrypt.genSalt(10);
    const contrasenaEncriptada = await bcrypt.hash(contrasena, salt);

    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      correo,
      contrasena: contrasenaEncriptada,
      id_tipo_usuario: id_tipo_usuario || 2
    });

    // No retornar el campo contrasena en la respuesta de éxito
    const { contrasena: _, ...usuarioData } = nuevoUsuario.toJSON();
    res.status(201).json({ mensaje: 'Usuario creado con éxito', usuario: usuarioData });

  } catch (error) {
    res.status(500).json({ error: 'Error del servidor', detalle: error.message });
  }
});

// 2. ENDPOINT: Iniciar Sesión (Login)
// POST /api/usuarios/login
router.post('/usuarios/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    // Buscar al usuario por correo
    const usuario = await Usuario.findOne({ where: { correo } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas (Correo no encontrado).' });
    }

    // Comparar contraseña ingresada con el hash de la BD
    const passwordValido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas (Contraseña incorrecta).' });
    }

    res.json({
      mensaje: '¡Inicio de sesión exitoso!',
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        id_tipo_usuario: usuario.id_tipo_usuario
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error del servidor', detalle: error.message });
  }
});

// 3. ENDPOINT: Crear Mascota
// POST /api/mascotas
router.post('/mascotas', async (req, res) => {
  try {
    const { nombre, raza, sexo, fecha_nacimiento, color, peso, foto, id_tipo_mascota, id_usuario } = req.body;

    // Validar requeridos mínimos
    if (!nombre || !sexo || !id_tipo_mascota || !id_usuario) {
      return res.status(400).json({ error: 'Los campos nombre, sexo, id_tipo_mascota e id_usuario son obligatorios.' });
    }

    const nuevaMascota = await Mascota.create({
      nombre,
      raza,
      sexo,
      fecha_nacimiento,
      color,
      peso,
      foto,
      id_tipo_mascota,
      id_usuario
    });

    res.status(201).json({ mensaje: 'Mascota registrada con éxito', mascota: nuevaMascota });

  } catch (error) {
    res.status(500).json({ error: 'Error al registrar la mascota', detalle: error.message });
  }
});

// 4. ENDPOINT: Agregar Cuidado
// POST /api/cuidados
router.post('/cuidados', async (req, res) => {
  try {
    const { id_mascota, tipo_cuidado, fecha, detalle, proxima_fecha, responsable, observaciones } = req.body;

    if (!id_mascota || !tipo_cuidado || !fecha || !detalle) {
      return res.status(400).json({ error: 'Los campos id_mascota, tipo_cuidado, fecha y detalle son obligatorios.' });
    }

    // Validar lógica de fechas según el CHECK constraint
    if (proxima_fecha && new Date(proxima_fecha) < new Date(fecha)) {
      return res.status(400).json({ error: 'La próxima fecha debe ser mayor o igual a la fecha del cuidado actual.' });
    }

    const nuevoCuidado = await Cuidado.create({
      id_mascota,
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

module.exports = router;

// =========================================================================
// ENDPOINTS DE CONSULTA (GET)
// =========================================================================

// 5. ENDPOINT: Obtener las mascotas de un usuario específico junto con sus cuidados
// GET /api/usuarios/:id_usuario/mascotas
router.get('/usuarios/:id_usuario/mascotas', async (req, res) => {
  try {
    const { id_usuario } = req.params;

    // Buscamos todas las mascotas vinculadas al id_usuario e incluimos su historial de cuidados
    const mascotas = await Mascota.findAll({
      where: { id_usuario },
      include: [
        {
          model: Cuidado,
          // Traerá el historial ordenado de la fecha más reciente a la más antigua
          order: [['fecha', 'DESC']] 
        }
      ]
    });

    if (mascotas.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron mascotas registradas para este usuario.' });
    }

    res.json(mascotas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las mascotas', detalle: error.message });
  }
});

// 6. ENDPOINT: Obtener el historial completo de cuidados de una mascota específica
// GET /api/mascotas/:id_mascota/cuidados
router.get('/mascotas/:id_mascota/cuidados', async (req, res) => {
  try {
    const { id_mascota } = req.params;

    // Validamos primero si la mascota existe
    const mascotaExiste = await Mascota.findByPk(id_mascota);
    if (!mascotaExiste) {
      return res.status(404).json({ error: 'La mascota especificada no existe.' });
    }

    // Buscamos todos los cuidados asociados a esa mascota
    const historialCuidados = await Cuidado.findAll({
      where: { id_mascota },
      order: [['fecha', 'DESC']]
    });

    res.json({
      mascota: mascotaExiste.nombre,
      total_cuidados: historialCuidados.length,
      historial: historialCuidados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial de cuidados', detalle: error.message });
  }
});

// 7. ENDPOINT: Obtener el perfil detallado de un usuario (Ocultando su contraseña)
// GET /api/usuarios/:id_usuario
router.get('/usuarios/:id_usuario', async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const usuario = await Usuario.findByPk(id_usuario, {
      attributes: { exclude: ['contrasena'] } // Excluimos el hash por seguridad
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el perfil del usuario', detalle: error.message });
  }
});

// =========================================================================
// ENDPOINTS DE ACTUALIZACIÓN (PUT) Y ELIMINACIÓN (DELETE)
// =========================================================================

// 8. ENDPOINT: Actualizar Mascota
// PUT /api/mascotas/:id_mascota
router.put('/mascotas/:id_mascota', async (req, res) => {
  try {
    const { id_mascota } = req.params;
    const mascota = await Mascota.findByPk(id_mascota);

    if (!mascota) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    await mascota.update(req.body);
    res.json({ mensaje: 'Mascota actualizada con éxito', mascota });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la mascota', detalle: error.message });
  }
});

// 9. ENDPOINT: Eliminar Mascota
// DELETE /api/mascotas/:id_mascota
router.delete('/mascotas/:id_mascota', async (req, res) => {
  try {
    const { id_mascota } = req.params;
    const mascota = await Mascota.findByPk(id_mascota);

    if (!mascota) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    await mascota.destroy();
    res.json({ mensaje: 'Mascota eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la mascota', detalle: error.message });
  }
});

// 10. ENDPOINT: Actualizar Cuidado
// PUT /api/cuidados/:id_cuidado
router.put('/cuidados/:id_cuidado', async (req, res) => {
  try {
    const { id_cuidado } = req.params;
    const cuidado = await Cuidado.findByPk(id_cuidado);

    if (!cuidado) {
      return res.status(404).json({ error: 'Registro de cuidado no encontrado.' });
    }

    await cuidado.update(req.body);
    res.json({ mensaje: 'Cuidado actualizado con éxito', cuidado });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el cuidado', detalle: error.message });
  }
});

// 11. ENDPOINT: Eliminar Cuidado
// DELETE /api/cuidados/:id_cuidado
router.delete('/cuidados/:id_cuidado', async (req, res) => {
  try {
    const { id_cuidado } = req.params;
    const cuidado = await Cuidado.findByPk(id_cuidado);

    if (!cuidado) {
      return res.status(404).json({ error: 'Registro de cuidado no encontrado.' });
    }

    await cuidado.destroy();
    res.json({ mensaje: 'Cuidado eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el cuidado', detalle: error.message });
  }
});

module.exports = router;

// 1. RUTA PUT: Reemplaza todo el registro del cuidado
router.put('/cuidados/:id_cuidado', async (req, res) => {
  try {
    const { id_cuidado } = req.params;
    const cuidado = await Cuidado.findByPk(id_cuidado);

    if (!cuidado) {
      return res.status(404).json({ mensaje: 'Cuidado no encontrado' });
    }

    const { id_mascota, tipo_cuidado, fecha, detalle, proxima_fecha, responsable, observaciones } = req.body;
    
    await cuidado.update({
      id_mascota,
      tipo_cuidado,
      fecha,
      detalle,
      proxima_fecha,
      responsable,
      observaciones
    });

    res.json({ mensaje: 'Cuidado actualizado completamente con PUT', cuidado });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el cuidado', detalle: error.message });
  }
});

// 2. RUTA PATCH: Actualiza solo los campos que envíes en el JSON
router.patch('/cuidados/:id_cuidado', async (req, res) => {
  try {
    const { id_cuidado } = req.params;
    const cuidado = await Cuidado.findByPk(id_cuidado);

    if (!cuidado) {
      return res.status(404).json({ mensaje: 'Cuidado no encontrado' });
    }

    await cuidado.update(req.body);

    res.json({ mensaje: 'Cuidado actualizado parcialmente con PATCH', cuidado });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar parcialmente', detalle: error.message });
  }
});

// ==========================================
// LOGIN DE USUARIO
// ==========================================
// POST /api/usuarios/login
router.post('/usuarios/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    // Buscar usuario por correo
    const usuario = await Usuario.findOne({ where: { correo } });
    if (!usuario) {
      return res.status(404).json({ error: 'El correo electrónico no está registrado.' });
    }

    // Comparar contraseña ingresada con la encriptada
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    // Devolver datos del usuario sin la contraseña
    const { contrasena: _, ...usuarioData } = usuario.toJSON();
    res.status(200).json({ mensaje: 'Inicio de sesión exitoso', usuario: usuarioData });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al iniciar sesión', detalle: error.message });
  }
});

// ==========================================
// CATÁLOGOS (TIPOS DE MASCOTA Y USUARIO)
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

// ==========================================
// RUTAS FALTANTES DE MASCOTAS (EDITAR Y ELIMINAR)
// ==========================================
// PUT /api/mascotas/:id_mascota (Actualizar mascota)
router.put('/mascotas/:id_mascota', async (req, res) => {
  try {
    const { id_mascota } = req.params;
    const mascota = await Mascota.findByPk(id_mascota);

    if (!mascota) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    await mascota.update(req.body);
    res.status(200).json({ mensaje: 'Mascota actualizada con éxito', mascota });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar mascota', detalle: error.message });
  }
});

// DELETE /api/mascotas/:id_mascota (Eliminar mascota)
router.delete('/mascotas/:id_mascota', async (req, res) => {
  try {
    const { id_mascota } = req.params;
    const mascota = await Mascota.findByPk(id_mascota);

    if (!mascota) {
      return res.status(404).json({ error: 'Mascota no encontrada.' });
    }

    await mascota.destroy();
    res.status(200).json({ mensaje: 'Mascota eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar mascota', detalle: error.message });
  }
});
module.exports = router;
