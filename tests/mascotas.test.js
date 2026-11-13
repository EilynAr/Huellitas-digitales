// Pruebas del módulo de mascotas: alta, edición, baja e historial de cuidados.

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
const Mascota = require('../models/Mascota');
const Cuidado = require('../models/Cuidado');
const { mascotaFake, cuidadoFake } = require('./factories');

describe('POST /api/mascotas', () => {
  test('registra la mascota y responde 201', async () => {
    Mascota.create.mockImplementation(async (datos) => mascotaFake(datos));

    const respuesta = await request(app).post('/api/mascotas').send({
      nombre: 'Luna',
      sexo: 'H',
      id_tipo_mascota: 1,
      id_usuario: 2
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.mensaje).toBe('Mascota registrada con éxito');
    expect(respuesta.body.mascota.nombre).toBe('Luna');
  });

  test('responde 400 y no consulta la base si faltan campos obligatorios', async () => {
    const respuesta = await request(app).post('/api/mascotas').send({
      nombre: 'Luna'
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'Los campos nombre, sexo, id_tipo_mascota e id_usuario son obligatorios.'
    );
    expect(Mascota.create).not.toHaveBeenCalled();
  });
});

describe('PUT /api/mascotas/:id_mascota', () => {
  test('actualiza la mascota y responde 200', async () => {
    const mascota = mascotaFake();
    Mascota.findByPk.mockResolvedValue(mascota);

    const respuesta = await request(app)
      .put('/api/mascotas/1')
      .send({ peso: 29.4 });

    expect(respuesta.status).toBe(200);
    expect(mascota.update).toHaveBeenCalledWith({ peso: 29.4 });
  });

  test('responde 404 si la mascota no existe', async () => {
    Mascota.findByPk.mockResolvedValue(null);

    const respuesta = await request(app)
      .put('/api/mascotas/999')
      .send({ peso: 10 });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Mascota no encontrada.');
  });
});

describe('DELETE /api/mascotas/:id_mascota', () => {
  test('elimina la mascota y responde 200', async () => {
    const mascota = mascotaFake();
    Mascota.findByPk.mockResolvedValue(mascota);

    const respuesta = await request(app).delete('/api/mascotas/1');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Mascota eliminada con éxito');
    expect(mascota.destroy).toHaveBeenCalled();
  });

  test('responde 404 si la mascota no existe', async () => {
    Mascota.findByPk.mockResolvedValue(null);

    const respuesta = await request(app).delete('/api/mascotas/999');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Mascota no encontrada.');
  });
});

describe('GET /api/mascotas/:id_mascota/cuidados', () => {
  test('devuelve el historial con el total de cuidados', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake());
    Cuidado.findAll.mockResolvedValue([
      cuidadoFake({ id_cuidado: 2 }),
      cuidadoFake({ id_cuidado: 3, tipo_cuidado: 'Baño' })
    ]);

    const respuesta = await request(app).get('/api/mascotas/1/cuidados');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mascota).toBe('Luna');
    expect(respuesta.body.total_cuidados).toBe(2);
    expect(respuesta.body.historial).toHaveLength(2);
  });

  test('responde 404 si la mascota no existe', async () => {
    Mascota.findByPk.mockResolvedValue(null);

    const respuesta = await request(app).get('/api/mascotas/999/cuidados');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('La mascota especificada no existe.');
    expect(Cuidado.findAll).not.toHaveBeenCalled();
  });
});
