// Pruebas de cuidados (vacunas y baños), catálogos y de la documentación OpenAPI.

jest.mock('../models/Usuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/Mascota', () => require('./helpers/modelos').modelo());
jest.mock('../models/Cuidado', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoUsuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoMascota', () => require('./helpers/modelos').modelo());

const request = require('supertest');

const app = require('../app');
const Mascota = require('../models/Mascota');
const Cuidado = require('../models/Cuidado');
const TipoMascota = require('../models/TipoMascota');
const TipoUsuario = require('../models/TipoUsuario');
const { autorizacion } = require('./helpers/auth');
const { mascotaFake, cuidadoFake } = require('./helpers/modelos');

const CUIDADO_VALIDO = {
  id_mascota: 11,
  tipo_cuidado: 'Vacuna',
  fecha: '2026-11-13',
  detalle: 'Refuerzo de rabia'
};

describe('POST /api/cuidados', () => {
  test('registra el cuidado en una mascota propia', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake());
    Cuidado.create.mockImplementation(async (datos) => cuidadoFake(datos));

    const respuesta = await request(app)
      .post('/api/cuidados')
      .set(autorizacion())
      .send(CUIDADO_VALIDO);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.mensaje).toBe('Registro de cuidado agregado con éxito');
    expect(Cuidado.create.mock.calls[0][0].id_mascota).toBe(11);
  });

  test('responde 400 si faltan campos obligatorios', async () => {
    const respuesta = await request(app)
      .post('/api/cuidados')
      .set(autorizacion())
      .send({ id_mascota: 11 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'Los campos id_mascota, tipo_cuidado, fecha y detalle son obligatorios.'
    );
    expect(Cuidado.create).not.toHaveBeenCalled();
  });

  test('responde 404 si la mascota es de otro usuario', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake({ id_usuario: 2 }));

    const respuesta = await request(app)
      .post('/api/cuidados')
      .set(autorizacion())
      .send(CUIDADO_VALIDO);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('La mascota especificada no existe.');
    expect(Cuidado.create).not.toHaveBeenCalled();
  });

  test('responde 400 si proxima_fecha es anterior a fecha', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake());

    const respuesta = await request(app)
      .post('/api/cuidados')
      .set(autorizacion())
      .send({ ...CUIDADO_VALIDO, fecha: '2026-05-10', proxima_fecha: '2026-01-01' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'La próxima fecha debe ser mayor o igual a la fecha del cuidado actual.'
    );
    expect(Cuidado.create).not.toHaveBeenCalled();
  });

  test('responde 401 sin token', async () => {
    const respuesta = await request(app).post('/api/cuidados').send(CUIDADO_VALIDO);

    expect(respuesta.status).toBe(401);
    expect(Cuidado.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/cuidados/:id_cuidado', () => {
  test('reemplaza los campos permitidos y descarta la mascota enviada', async () => {
    const cuidado = cuidadoFake();
    Cuidado.findByPk.mockResolvedValue(cuidado);
    Mascota.findByPk.mockResolvedValue(mascotaFake());

    const respuesta = await request(app)
      .put('/api/cuidados/13')
      .set(autorizacion())
      .send({ detalle: 'Refuerzo anual de rabia', id_mascota: 1 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Cuidado actualizado con éxito');
    expect(cuidado.update).toHaveBeenCalledWith({ detalle: 'Refuerzo anual de rabia' });
  });

  test('responde 404 si el cuidado no existe', async () => {
    Cuidado.findByPk.mockResolvedValue(null);

    const respuesta = await request(app)
      .put('/api/cuidados/999')
      .set(autorizacion())
      .send({ detalle: 'x' });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Registro de cuidado no encontrado.');
  });

  test('responde 404 si el cuidado pertenece a una mascota ajena', async () => {
    Cuidado.findByPk.mockResolvedValue(cuidadoFake({ id_mascota: 1 }));
    Mascota.findByPk.mockResolvedValue(mascotaFake({ id_mascota: 1, id_usuario: 2 }));

    const respuesta = await request(app)
      .put('/api/cuidados/13')
      .set(autorizacion())
      .send({ detalle: 'x' });

    expect(respuesta.status).toBe(404);
  });
});

describe('PATCH /api/cuidados/:id_cuidado', () => {
  test('actualiza solo los campos enviados', async () => {
    const cuidado = cuidadoFake();
    Cuidado.findByPk.mockResolvedValue(cuidado);
    Mascota.findByPk.mockResolvedValue(mascotaFake());

    const respuesta = await request(app)
      .patch('/api/cuidados/13')
      .set(autorizacion())
      .send({ observaciones: 'Sin reacciones adversas' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Cuidado actualizado parcialmente con PATCH');
    expect(cuidado.update).toHaveBeenCalledWith({ observaciones: 'Sin reacciones adversas' });
  });

  test('responde 404 si el cuidado no existe', async () => {
    Cuidado.findByPk.mockResolvedValue(null);

    const respuesta = await request(app)
      .patch('/api/cuidados/999')
      .set(autorizacion())
      .send({ observaciones: 'x' });

    expect(respuesta.status).toBe(404);
  });
});

describe('DELETE /api/cuidados/:id_cuidado', () => {
  test('elimina un cuidado propio', async () => {
    const cuidado = cuidadoFake();
    Cuidado.findByPk.mockResolvedValue(cuidado);
    Mascota.findByPk.mockResolvedValue(mascotaFake());

    const respuesta = await request(app).delete('/api/cuidados/13').set(autorizacion());

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Cuidado eliminado con éxito');
    expect(cuidado.destroy).toHaveBeenCalled();
  });

  test('responde 404 y no borra si la mascota es ajena', async () => {
    const cuidado = cuidadoFake({ id_mascota: 1 });
    Cuidado.findByPk.mockResolvedValue(cuidado);
    Mascota.findByPk.mockResolvedValue(mascotaFake({ id_mascota: 1, id_usuario: 2 }));

    const respuesta = await request(app).delete('/api/cuidados/13').set(autorizacion());

    expect(respuesta.status).toBe(404);
    expect(cuidado.destroy).not.toHaveBeenCalled();
  });
});

describe('Catálogos (públicos)', () => {
  test('GET /api/tipos-mascota no pide token', async () => {
    TipoMascota.findAll.mockResolvedValue([
      { id_tipo_mascota: 1, nombre: 'Perro' },
      { id_tipo_mascota: 2, nombre: 'Gato' }
    ]);

    const respuesta = await request(app).get('/api/tipos-mascota');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(2);
  });

  test('GET /api/tipos-usuario no pide token', async () => {
    TipoUsuario.findAll.mockResolvedValue([
      { id_tipo_usuario: 1, nombre: 'Administrador' },
      { id_tipo_usuario: 2, nombre: 'Usuario' }
    ]);

    const respuesta = await request(app).get('/api/tipos-usuario');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.map((t) => t.nombre)).toEqual(['Administrador', 'Usuario']);
  });
});

describe('Documentación OpenAPI', () => {
  test('expone las 14 operaciones con el esquema de seguridad JWT', async () => {
    const respuesta = await request(app).get('/api-docs.json');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.openapi).toBe('3.0.3');
    expect(respuesta.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');

    const operaciones = Object.values(respuesta.body.paths).reduce(
      (total, path) =>
        total +
        Object.keys(path).filter((metodo) =>
          ['get', 'post', 'put', 'patch', 'delete'].includes(metodo)
        ).length,
      0
    );

    expect(Object.keys(respuesta.body.paths)).toHaveLength(11);
    expect(operaciones).toBe(14);
  });

  test('marca como públicos solo registro, login y catálogos', async () => {
    const { body } = await request(app).get('/api-docs.json');

    const publicas = [];
    for (const [ruta, operaciones] of Object.entries(body.paths)) {
      for (const [metodo, operacion] of Object.entries(operaciones)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(metodo)) continue;
        if (operacion.security && operacion.security.length === 0) {
          publicas.push(`${metodo.toUpperCase()} ${ruta}`);
        }
      }
    }

    expect(publicas.sort()).toEqual([
      'GET /api/tipos-mascota',
      'GET /api/tipos-usuario',
      'POST /api/usuarios/login',
      'POST /api/usuarios/registro'
    ]);
  });
});
