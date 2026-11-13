// Fábricas de instancias falsas de los modelos Sequelize para las pruebas.
// Reproducen la forma que devolvería la base de datos, sin conexión real.

const usuarioFake = (overrides = {}) => {
  const data = {
    id_usuario: 2,
    nombre: 'María',
    apellido: 'Pérez',
    correo: 'maria.perez@correo.com',
    contrasena: 'hash-de-prueba',
    id_tipo_usuario: 2,
    ...overrides
  };

  // Sequelize expone toJSON() en cada instancia
  return { ...data, toJSON: () => ({ ...data }) };
};

const mascotaFake = (overrides = {}) => {
  const data = {
    id_mascota: 1,
    nombre: 'Luna',
    raza: 'Golden Retriever',
    sexo: 'H',
    fecha_nacimiento: '2021-03-12',
    color: 'Dorado',
    peso: 28.5,
    foto: null,
    id_tipo_mascota: 1,
    id_usuario: 2,
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
    id_cuidado: 2,
    id_mascota: 1,
    tipo_cuidado: 'Vacuna',
    fecha: '2025-10-02',
    detalle: 'Parvovirus',
    proxima_fecha: '2026-12-02',
    responsable: 'Dra. Rojas',
    observaciones: null,
    ...overrides
  };

  return {
    ...data,
    update: jest.fn().mockResolvedValue(data),
    destroy: jest.fn().mockResolvedValue(undefined)
  };
};

module.exports = { usuarioFake, mascotaFake, cuidadoFake };
