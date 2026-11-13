// Pruebas del módulo de usuarios: registro, login y perfil.
// Los modelos Sequelize se reemplazan por mocks: no se abre ninguna conexión a MySQL.

jest.mock('../models/Usuario', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));
jest.mock('../models/Mascota', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));
jest.mock('../models/Cuidado', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));
jest.mock('../models/TipoUsuario', () => ({
  findAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));
jest.mock('../models/TipoMascota', () => ({
  findAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../app');
const Usuario = require('../models/Usuario');
const Mascota = require('../models/Mascota');
const { usuarioFake, mascotaFake } = require('./factories');

describe('POST /api/usuarios/registro', () => {
  test('crea el usuario y encripta la contraseña', async () => {
    Usuario.findOne.mockResolvedValue(null);
    Usuario.create.mockImplementation(async (datos) => usuarioFake(datos));

    const respuesta = await request(app).post('/api/usuarios/registro').send({
      nombre: 'María',
      apellido: 'Pérez',
      correo: 'maria.perez@correo.com',
      contrasena: '123456'
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.mensaje).toBe('Usuario creado con éxito');
    expect(respuesta.body.usuario.correo).toBe('maria.perez@correo.com');
    expect(respuesta.body.usuario.contrasena).toBeUndefined();

    const datosGuardados = Usuario.create.mock.calls[0][0];
    expect(datosGuardados.contrasena).not.toBe('123456');
    expect(await bcrypt.compare('123456', datosGuardados.contrasena)).toBe(true);
    // Si no se envía id_tipo_usuario debe quedar 2 (Usuario)
    expect(datosGuardados.id_tipo_usuario).toBe(2);
  });

  test('responde 400 si el correo ya está registrado', async () => {
    Usuario.findOne.mockResolvedValue(usuarioFake());

    const respuesta = await request(app).post('/api/usuarios/registro').send({
      nombre: 'María',
      apellido: 'Pérez',
      correo: 'maria.perez@correo.com',
      contrasena: '123456'
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe('El correo electrónico ya está registrado.');
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  test('responde 500 si la base de datos falla', async () => {
    Usuario.findOne.mockRejectedValue(new Error('conexión perdida'));

    const respuesta = await request(app).post('/api/usuarios/registro').send({
      nombre: 'María',
      apellido: 'Pérez',
      correo: 'maria.perez@correo.com',
      contrasena: '123456'
    });

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.detalle).toBe('conexión perdida');
  });
});

describe('POST /api/usuarios/login', () => {
  const contrasena = '123456';
  let hash;

  beforeAll(async () => {
    hash = await bcrypt.hash(contrasena, 10);
  });

  test('responde 200 con los datos del usuario si las credenciales son válidas', async () => {
    Usuario.findOne.mockResolvedValue(usuarioFake({ contrasena: hash }));

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'maria.perez@correo.com', contrasena });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.id_usuario).toBe(2);
    expect(respuesta.body.usuario.contrasena).toBeUndefined();
  });

  test('responde 401 si la contraseña es incorrecta', async () => {
    Usuario.findOne.mockResolvedValue(usuarioFake({ contrasena: hash }));

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'maria.perez@correo.com', contrasena: 'otra-clave' });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toContain('Contraseña incorrecta');
  });

  test('responde 401 si el correo no existe', async () => {
    Usuario.findOne.mockResolvedValue(null);

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'nadie@correo.com', contrasena });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toContain('Correo no encontrado');
  });
});

describe('GET /api/usuarios/:id_usuario', () => {
  test('excluye la contraseña de la consulta y responde 200', async () => {
    Usuario.findByPk.mockResolvedValue(
      usuarioFake({ contrasena: undefined })
    );

    const respuesta = await request(app).get('/api/usuarios/2');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.nombre).toBe('María');
    expect(Usuario.findByPk).toHaveBeenCalledWith('2', {
      attributes: { exclude: ['contrasena'] }
    });
  });

  test('responde 404 si el usuario no existe', async () => {
    Usuario.findByPk.mockResolvedValue(null);

    const respuesta = await request(app).get('/api/usuarios/999');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Usuario no encontrado.');
  });
});

describe('GET /api/usuarios/:id_usuario/mascotas', () => {
  test('devuelve las mascotas con su historial de cuidados', async () => {
    Mascota.findAll.mockResolvedValue([
      mascotaFake({ cuidados: [{ id_cuidado: 2, tipo_cuidado: 'Vacuna' }] })
    ]);

    const respuesta = await request(app).get('/api/usuarios/2/mascotas');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(1);
    expect(respuesta.body[0].cuidados).toHaveLength(1);
    expect(Mascota.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_usuario: '2' } })
    );
  });

  test('responde 404 si el usuario no tiene mascotas', async () => {
    Mascota.findAll.mockResolvedValue([]);

    const respuesta = await request(app).get('/api/usuarios/999/mascotas');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.mensaje).toBe(
      'No se encontraron mascotas registradas para este usuario.'
    );
  });
});
