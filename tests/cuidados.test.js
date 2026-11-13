// Pruebas del módulo de cuidados (vacunas y baños) y de los catálogos.

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
const app = require('../app');
const Cuidado = require('../models/Cuidado');
const TipoMascota = require('../models/TipoMascota');
const TipoUsuario = require('../models/TipoUsuario');
const { cuidadoFake } = require('./factories');

describe('POST /api/cuidados', () => {
  test('registra el cuidado y responde 201', async () => {
    Cuidado.create.mockImplementation(async (datos) => cuidadoFake(datos));

    const respuesta = await request(app).post('/api/cuidados').send({
      id_mascota: 1,
      tipo_cuidado: 'Vacuna',
      fecha: '2025-10-02',
      detalle: 'Parvovirus'
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.mensaje).toBe('Registro de cuidado agregado con éxito');
    expect(respuesta.body.cuidado.tipo_cuidado).toBe('Vacuna');
  });

  test('responde 400 si faltan campos obligatorios', async () => {
    const respuesta = await request(app).post('/api/cuidados').send({
      id_mascota: 1
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'Los campos id_mascota, tipo_cuidado, fecha y detalle son obligatorios.'
    );
    expect(Cuidado.create).not.toHaveBeenCalled();
  });

  test('responde 400 si proxima_fecha es anterior a fecha', async () => {
    const respuesta = await request(app).post('/api/cuidados').send({
      id_mascota: 1,
      tipo_cuidado: 'Vacuna',
      fecha: '2026-05-10',
      detalle: 'Rabia',
      proxima_fecha: '2026-01-01'
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'La próxima fecha debe ser mayor o igual a la fecha del cuidado actual.'
    );
    expect(Cuidado.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/cuidados/:id_cuidado', () => {
  test('reemplaza el cuidado y responde 200', async () => {
    const cuidado = cuidadoFake();
    Cuidado.findByPk.mockResolvedValue(cuidado);

    const respuesta = await request(app)
      .put('/api/cuidados/2')
      .send({ detalle: 'Refuerzo de parvovirus' });

    expect(respuesta.status).toBe(200);
    expect(cuidado.update).toHaveBeenCalledWith({
      detalle: 'Refuerzo de parvovirus'
    });
  });

  test('responde 404 si el cuidado no existe', async () => {
    Cuidado.findByPk.mockResolvedValue(null);

    const respuesta = await request(app)
      .put('/api/cuidados/999')
      .send({ detalle: 'x' });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Registro de cuidado no encontrado.');
  });
});

describe('PATCH /api/cuidados/:id_cuidado', () => {
  test('actualiza solo los campos enviados', async () => {
    const cuidado = cuidadoFake();
    Cuidado.findByPk.mockResolvedValue(cuidado);

    const respuesta = await request(app)
      .patch('/api/cuidados/2')
      .send({ observaciones: 'Sin reacciones adversas' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Cuidado actualizado parcialmente con PATCH');
    expect(cuidado.update).toHaveBeenCalledWith({
      observaciones: 'Sin reacciones adversas'
    });
  });

  test('responde 404 si el cuidado no existe', async () => {
    Cuidado.findByPk.mockResolvedValue(null);

    const respuesta = await request(app)
      .patch('/api/cuidados/999')
      .send({ observaciones: 'x' });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.mensaje).toBe('Cuidado no encontrado');
  });
});

describe('DELETE /api/cuidados/:id_cuidado', () => {
  test('elimina el cuidado y responde 200', async () => {
    const cuidado = cuidadoFake();
    Cuidado.findByPk.mockResolvedValue(cuidado);

    const respuesta = await request(app).delete('/api/cuidados/2');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Cuidado eliminado con éxito');
    expect(cuidado.destroy).toHaveBeenCalled();
  });

  test('responde 404 si el cuidado no existe', async () => {
    Cuidado.findByPk.mockResolvedValue(null);

    const respuesta = await request(app).delete('/api/cuidados/999');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Registro de cuidado no encontrado.');
  });
});

describe('Catálogos', () => {
  test('GET /api/tipos-mascota devuelve el catálogo', async () => {
    TipoMascota.findAll.mockResolvedValue([
      { id_tipo_mascota: 1, nombre: 'Perro' },
      { id_tipo_mascota: 2, nombre: 'Gato' }
    ]);

    const respuesta = await request(app).get('/api/tipos-mascota');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(2);
    expect(respuesta.body[0].nombre).toBe('Perro');
  });

  test('GET /api/tipos-usuario devuelve el catálogo', async () => {
    TipoUsuario.findAll.mockResolvedValue([
      { id_tipo_usuario: 1, nombre: 'Administrador' },
      { id_tipo_usuario: 2, nombre: 'Usuario' }
    ]);

    const respuesta = await request(app).get('/api/tipos-usuario');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(2);
  });
});

describe('Documentación de la API', () => {
  test('GET /api-docs.json expone la especificación OpenAPI de todas las rutas', async () => {
    const respuesta = await request(app).get('/api-docs.json');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.openapi).toBe('3.0.3');

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
});
