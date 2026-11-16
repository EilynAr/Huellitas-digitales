// Pruebas del perfil de usuario y de sus mascotas, incluyendo el control de
// permisos: cada usuario solo puede ver lo suyo (403 en caso contrario).

jest.mock('../models/Usuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/Mascota', () => require('./helpers/modelos').modelo());
jest.mock('../models/Cuidado', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoUsuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoMascota', () => require('./helpers/modelos').modelo());

const request = require('supertest');

const app = require('../app');
const Usuario = require('../models/Usuario');
const Mascota = require('../models/Mascota');
const { autorizacion } = require('./helpers/auth');
const { usuarioFake, mascotaFake } = require('./helpers/modelos');

describe('GET /api/usuarios/:id_usuario', () => {
  test('devuelve el perfil sin la contraseña', async () => {
    Usuario.findByPk.mockResolvedValue(usuarioFake({ contrasena: undefined }));

    const respuesta = await request(app).get('/api/usuarios/6').set(autorizacion());

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.correo).toBe('eilyn.angarita@correo.com');
    expect(respuesta.body.contrasena).toBeUndefined();
  });

  test('ignora el id de la URL y consulta el del token', async () => {
    Usuario.findByPk.mockResolvedValue(usuarioFake({ contrasena: undefined }));

    await request(app).get('/api/usuarios/6').set(autorizacion());

    expect(Usuario.findByPk).toHaveBeenCalledWith(6, {
      attributes: { exclude: ['contrasena'] }
    });
  });

  test('responde 403 si intenta ver el perfil de otro usuario', async () => {
    const respuesta = await request(app).get('/api/usuarios/2').set(autorizacion());

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error).toBe('No puedes ver el perfil de otro usuario.');
    expect(Usuario.findByPk).not.toHaveBeenCalled();
  });

  test('responde 404 si el usuario del token ya no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);

    const respuesta = await request(app).get('/api/usuarios/6').set(autorizacion());

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Usuario no encontrado.');
  });

  test('responde 500 si la base falla', async () => {
    Usuario.findByPk.mockRejectedValue(new Error('conexión perdida'));

    const respuesta = await request(app).get('/api/usuarios/6').set(autorizacion());

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.detalle).toBe('conexión perdida');
  });
});

describe('GET /api/usuarios/:id_usuario/mascotas', () => {
  test('devuelve las mascotas con el arreglo Cuidados', async () => {
    Mascota.findAll.mockResolvedValue([
      // Sequelize nombra el include con la mayúscula del modelo: `Cuidados`
      mascotaFake({ Cuidados: [{ id_cuidado: 13, tipo_cuidado: 'Vacuna' }] })
    ]);

    const respuesta = await request(app).get('/api/usuarios/6/mascotas').set(autorizacion());

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(1);
    expect(respuesta.body[0].Cuidados).toHaveLength(1);
    expect(Mascota.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_usuario: 6 } })
    );
  });

  test('responde 403 si pide las mascotas de otro usuario', async () => {
    const respuesta = await request(app).get('/api/usuarios/2/mascotas').set(autorizacion());

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error).toBe('No puedes ver las mascotas de otro usuario.');
    expect(Mascota.findAll).not.toHaveBeenCalled();
  });

  test('responde 404 si el usuario no tiene mascotas', async () => {
    Mascota.findAll.mockResolvedValue([]);

    const respuesta = await request(app).get('/api/usuarios/6/mascotas').set(autorizacion());

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.mensaje).toBe(
      'No se encontraron mascotas registradas para este usuario.'
    );
  });

  test('responde 401 sin token', async () => {
    const respuesta = await request(app).get('/api/usuarios/6/mascotas');

    expect(respuesta.status).toBe(401);
    expect(Mascota.findAll).not.toHaveBeenCalled();
  });
});
