// Pruebas de autenticación: registro, login y middleware JWT.
// Es el módulo más crítico: un error acá deja la API abierta o deja a todos afuera.

jest.mock('../models/Usuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/Mascota', () => require('./helpers/modelos').modelo());
jest.mock('../models/Cuidado', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoUsuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoMascota', () => require('./helpers/modelos').modelo());

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = require('../app');
const Usuario = require('../models/Usuario');
const { SECRETO, tokenDe, autorizacion } = require('./helpers/auth');
const { usuarioFake } = require('./helpers/modelos');

const CUERPO_REGISTRO = {
  nombre: 'María',
  apellido: 'Pérez',
  correo: 'maria.perez@correo.com',
  contrasena: '123456'
};

describe('POST /api/usuarios/registro', () => {
  test('crea el usuario, encripta la contraseña y devuelve un token válido', async () => {
    Usuario.findOne.mockResolvedValue(null);
    Usuario.create.mockImplementation(async (datos) => usuarioFake(datos));

    const respuesta = await request(app).post('/api/usuarios/registro').send(CUERPO_REGISTRO);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.correo).toBe('maria.perez@correo.com');
    expect(respuesta.body.usuario.contrasena).toBeUndefined();

    // El token emitido tiene que servir para rutas protegidas
    const payload = jwt.verify(respuesta.body.token, SECRETO);
    expect(payload).toMatchObject({ id_usuario: 6, id_tipo_usuario: 2 });
    expect(payload.exp).toBeGreaterThan(payload.iat);

    const guardado = Usuario.create.mock.calls[0][0];
    expect(guardado.contrasena).not.toBe('123456');
    expect(await bcrypt.compare('123456', guardado.contrasena)).toBe(true);
  });

  test('fuerza el tipo Usuario aunque el cliente pida Administrador', async () => {
    Usuario.findOne.mockResolvedValue(null);
    Usuario.create.mockImplementation(async (datos) => usuarioFake(datos));

    await request(app)
      .post('/api/usuarios/registro')
      .send({ ...CUERPO_REGISTRO, id_tipo_usuario: 1 });

    expect(Usuario.create.mock.calls[0][0].id_tipo_usuario).toBe(2);
  });

  test('responde 400 si falta un campo obligatorio', async () => {
    const respuesta = await request(app)
      .post('/api/usuarios/registro')
      .send({ nombre: 'María', correo: 'maria.perez@correo.com' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'nombre, apellido, correo y contrasena son obligatorios.'
    );
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  test('responde 400 si el correo ya está registrado', async () => {
    Usuario.findOne.mockResolvedValue(usuarioFake());

    const respuesta = await request(app).post('/api/usuarios/registro').send(CUERPO_REGISTRO);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe('El correo electrónico ya está registrado.');
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  test('responde 500 si la base falla', async () => {
    Usuario.findOne.mockRejectedValue(new Error('conexión perdida'));

    const respuesta = await request(app).post('/api/usuarios/registro').send(CUERPO_REGISTRO);

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

  test('responde 200 con el usuario y un token válido', async () => {
    Usuario.findOne.mockResolvedValue(usuarioFake({ contrasena: hash }));

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'eilyn.angarita@correo.com', contrasena });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.id_usuario).toBe(6);
    expect(respuesta.body.usuario.contrasena).toBeUndefined();

    const payload = jwt.verify(respuesta.body.token, SECRETO);
    expect(payload.id_usuario).toBe(6);
  });

  test('no filtra si el correo existe: mismo mensaje con contraseña incorrecta', async () => {
    Usuario.findOne.mockResolvedValue(usuarioFake({ contrasena: hash }));

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'eilyn.angarita@correo.com', contrasena: 'otra-clave' });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toBe('Credenciales inválidas.');
    expect(respuesta.body.token).toBeUndefined();
  });

  test('no filtra si el correo existe: mismo mensaje con correo inexistente', async () => {
    Usuario.findOne.mockResolvedValue(null);

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'nadie@correo.com', contrasena });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toBe('Credenciales inválidas.');
    expect(respuesta.body.token).toBeUndefined();
  });

  test('responde 500 si la base falla', async () => {
    Usuario.findOne.mockRejectedValue(new Error('timeout'));

    const respuesta = await request(app)
      .post('/api/usuarios/login')
      .send({ correo: 'eilyn.angarita@correo.com', contrasena });

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error).toBe('Error al iniciar sesión');
  });
});

describe('Middleware verificarToken', () => {
  beforeEach(() => {
    Usuario.findByPk.mockResolvedValue(usuarioFake({ contrasena: undefined }));
  });

  test('responde 401 sin encabezado Authorization', async () => {
    const respuesta = await request(app).get('/api/usuarios/6');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toBe('Debes iniciar sesión.');
    expect(Usuario.findByPk).not.toHaveBeenCalled();
  });

  test('responde 401 si el encabezado no es Bearer', async () => {
    const respuesta = await request(app)
      .get('/api/usuarios/6')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toBe('Debes iniciar sesión.');
  });

  test('responde 401 con un token con formato inválido', async () => {
    const respuesta = await request(app)
      .get('/api/usuarios/6')
      .set('Authorization', 'Bearer esto-no-es-un-jwt');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error).toBe('Sesión inválida o vencida. Vuelve a iniciar sesión.');
  });

  test('responde 401 si el token está firmado con otro secreto', async () => {
    const ajeno = jwt.sign({ id_usuario: 6, id_tipo_usuario: 2 }, 'otro-secreto');

    const respuesta = await request(app)
      .get('/api/usuarios/6')
      .set('Authorization', `Bearer ${ajeno}`);

    expect(respuesta.status).toBe(401);
  });

  test('responde 401 si el token está vencido', async () => {
    const vencido = tokenDe({}, { expiresIn: '-1s' });

    const respuesta = await request(app)
      .get('/api/usuarios/6')
      .set('Authorization', `Bearer ${vencido}`);

    expect(respuesta.status).toBe(401);
    expect(Usuario.findByPk).not.toHaveBeenCalled();
  });

  test('deja pasar con un token válido', async () => {
    const respuesta = await request(app).get('/api/usuarios/6').set(autorizacion());

    expect(respuesta.status).toBe(200);
    // Consulta el perfil del usuario del token, no del parámetro
    expect(Usuario.findByPk).toHaveBeenCalledWith(6, {
      attributes: { exclude: ['contrasena'] }
    });
  });
});
