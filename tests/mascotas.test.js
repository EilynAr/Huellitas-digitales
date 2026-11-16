// Pruebas del CRUD de mascotas. Lo importante acá es la propiedad del recurso:
// el dueño sale del token y una mascota ajena responde 404 (no 403, para no filtrar que existe).

jest.mock('../models/Usuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/Mascota', () => require('./helpers/modelos').modelo());
jest.mock('../models/Cuidado', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoUsuario', () => require('./helpers/modelos').modelo());
jest.mock('../models/TipoMascota', () => require('./helpers/modelos').modelo());

const request = require('supertest');

const app = require('../app');
const Mascota = require('../models/Mascota');
const Cuidado = require('../models/Cuidado');
const { autorizacion } = require('./helpers/auth');
const { mascotaFake, cuidadoFake } = require('./helpers/modelos');

describe('POST /api/mascotas', () => {
  test('registra la mascota con el dueño tomado del token', async () => {
    Mascota.create.mockImplementation(async (datos) => mascotaFake(datos));

    const respuesta = await request(app)
      .post('/api/mascotas')
      .set(autorizacion())
      .send({
        nombre: 'Molly',
        sexo: 'H',
        id_tipo_mascota: 2,
        id_usuario: 2 // intento de asignarla a otro dueño
      });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.mensaje).toBe('Mascota registrada con éxito');
    expect(Mascota.create.mock.calls[0][0].id_usuario).toBe(6);
  });

  test('responde 400 si faltan campos obligatorios', async () => {
    const respuesta = await request(app)
      .post('/api/mascotas')
      .set(autorizacion())
      .send({ nombre: 'Molly' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe(
      'Los campos nombre, sexo e id_tipo_mascota son obligatorios.'
    );
    expect(Mascota.create).not.toHaveBeenCalled();
  });

  test('responde 401 sin token', async () => {
    const respuesta = await request(app)
      .post('/api/mascotas')
      .send({ nombre: 'Molly', sexo: 'H', id_tipo_mascota: 2 });

    expect(respuesta.status).toBe(401);
    expect(Mascota.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/mascotas/:id_mascota/cuidados', () => {
  test('devuelve el historial con el total', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake());
    Cuidado.findAll.mockResolvedValue([
      cuidadoFake({ id_cuidado: 13 }),
      cuidadoFake({ id_cuidado: 14, tipo_cuidado: 'Baño' })
    ]);

    const respuesta = await request(app)
      .get('/api/mascotas/11/cuidados')
      .set(autorizacion());

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mascota).toBe('Molly');
    expect(respuesta.body.total_cuidados).toBe(2);
    expect(respuesta.body.historial).toHaveLength(2);
  });

  test('responde 404 si la mascota es de otro usuario', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake({ id_usuario: 2 }));

    const respuesta = await request(app)
      .get('/api/mascotas/11/cuidados')
      .set(autorizacion());

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('La mascota especificada no existe.');
    expect(Cuidado.findAll).not.toHaveBeenCalled();
  });

  test('responde 404 si la mascota no existe', async () => {
    Mascota.findByPk.mockResolvedValue(null);

    const respuesta = await request(app)
      .get('/api/mascotas/999/cuidados')
      .set(autorizacion());

    expect(respuesta.status).toBe(404);
  });
});

describe('PUT /api/mascotas/:id_mascota', () => {
  test('actualiza los campos permitidos y descarta el dueño enviado', async () => {
    const mascota = mascotaFake();
    Mascota.findByPk.mockResolvedValue(mascota);

    const respuesta = await request(app)
      .put('/api/mascotas/11')
      .set(autorizacion())
      .send({ peso: 9.75, id_usuario: 2, id_mascota: 99 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Mascota actualizada con éxito');
    expect(mascota.update).toHaveBeenCalledWith({ peso: 9.75 });
  });

  test('responde 404 si la mascota es de otro usuario', async () => {
    Mascota.findByPk.mockResolvedValue(mascotaFake({ id_usuario: 2 }));

    const respuesta = await request(app)
      .put('/api/mascotas/11')
      .set(autorizacion())
      .send({ peso: 9.75 });

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBe('Mascota no encontrada.');
  });

  test('responde 500 si la base falla al actualizar', async () => {
    const mascota = mascotaFake();
    mascota.update.mockRejectedValue(new Error('deadlock'));
    Mascota.findByPk.mockResolvedValue(mascota);

    const respuesta = await request(app)
      .put('/api/mascotas/11')
      .set(autorizacion())
      .send({ peso: 9.75 });

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.detalle).toBe('deadlock');
  });
});

describe('DELETE /api/mascotas/:id_mascota', () => {
  test('elimina la mascota propia', async () => {
    const mascota = mascotaFake();
    Mascota.findByPk.mockResolvedValue(mascota);

    const respuesta = await request(app).delete('/api/mascotas/11').set(autorizacion());

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.mensaje).toBe('Mascota eliminada con éxito');
    expect(mascota.destroy).toHaveBeenCalled();
  });

  test('responde 404 si la mascota es de otro usuario y no la borra', async () => {
    const mascota = mascotaFake({ id_usuario: 2 });
    Mascota.findByPk.mockResolvedValue(mascota);

    const respuesta = await request(app).delete('/api/mascotas/11').set(autorizacion());

    expect(respuesta.status).toBe(404);
    expect(mascota.destroy).not.toHaveBeenCalled();
  });

  test('responde 404 si la mascota no existe', async () => {
    Mascota.findByPk.mockResolvedValue(null);

    const respuesta = await request(app).delete('/api/mascotas/999').set(autorizacion());

    expect(respuesta.status).toBe(404);
  });
});
