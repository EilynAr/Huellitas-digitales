// Mocks de los modelos Sequelize y fábricas de instancias falsas.
// Las pruebas no abren conexión: cada modelo expone los métodos que usa routes/api.js
// como jest.fn(), más hasMany/belongsTo para que models/index.js pueda registrar asociaciones.

const modelo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
  update: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
});

const usuarioFake = (overrides = {}) => {
  const data = {
    id_usuario: 6,
    nombre: 'eilyn',
    apellido: 'angarita',
    correo: 'eilyn.angarita@correo.com',
    contrasena: 'hash-de-prueba',
    id_tipo_usuario: 2,
    ...overrides
  };

  // Sequelize expone toJSON() en cada instancia
  return { ...data, toJSON: () => ({ ...data }) };
};

const mascotaFake = (overrides = {}) => {
  const data = {
    id_mascota: 11,
    nombre: 'Molly',
    raza: 'Siames',
    sexo: 'H',
    fecha_nacimiento: '2023-05-25',
    color: 'Blanco con gris',
    peso: 9,
    foto: null,
    id_tipo_mascota: 2,
    id_usuario: 6,
    ...overrides
  };

  return {
    ...data,
    update: jest.fn().mockResolvedValue(data),
    destroy: jest.fn().mockResolvedValue(undefined)
  };
};

const cuidadoFake = (overrides = {}) => {
  const data = {
    id_cuidado: 13,
    id_mascota: 11,
    tipo_cuidado: 'Vacuna',
    fecha: '2025-10-19',
    detalle: 'Rabia',
    proxima_fecha: '2026-10-19',
    responsable: 'Carlos',
    observaciones: null,
    ...overrides
  };

  return {
    ...data,
    update: jest.fn().mockResolvedValue(data),
    destroy: jest.fn().mockResolvedValue(undefined)
  };
};

module.exports = { modelo, usuarioFake, mascotaFake, cuidadoFake };
