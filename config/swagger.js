const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Rutas de los archivos con anotaciones @openapi (paths con "/" para que funcione en Windows)
const routesGlob = path.join(__dirname, '..', 'routes', '*.js').split(path.sep).join('/');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Huellitas Digitales API',
    version: '1.0.0',
    description: [
      'API REST para la gestión de usuarios, mascotas y su historial de cuidados (vacunas y baños).',
      '',
      '**Autenticación:** JWT. Hacé `POST /api/usuarios/login` (o el registro) para obtener un `token` y después enviá `Authorization: Bearer <token>`.',
      '',
      'En Swagger UI: iniciá sesión desde `POST /api/usuarios/login`, copiá el campo `token` de la respuesta y pegalo con el botón **Authorize**.',
      '',
      '**Permisos:** cada usuario solo puede ver y modificar sus propias mascotas y cuidados; el dueño sale del token, no del cuerpo de la petición.'
    ].join('\n')
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Servidor local (Express + MySQL en Docker)'
    }
  ],
  tags: [
    { name: 'Usuarios', description: 'Registro, login y perfil' },
    { name: 'Mascotas', description: 'CRUD de mascotas' },
    { name: 'Cuidados', description: 'Historial de vacunas y baños' },
    { name: 'Catálogos', description: 'Tablas de referencia' }
  ],
  // Por defecto todas las rutas piden JWT; las públicas lo desactivan con `security: []`
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token devuelto por el login o el registro, con 8 horas de validez.'
      }
    },
    schemas: {
      Usuario: {
        type: 'object',
        properties: {
          id_usuario: { type: 'integer', example: 2 },
          nombre: { type: 'string', example: 'María' },
          apellido: { type: 'string', example: 'Pérez' },
          correo: { type: 'string', format: 'email', example: 'maria.perez@correo.com' },
          id_tipo_usuario: { type: 'integer', example: 2, description: '1 = Administrador, 2 = Usuario' }
        }
      },
      Mascota: {
        type: 'object',
        properties: {
          id_mascota: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Luna' },
          raza: { type: 'string', nullable: true, example: 'Golden Retriever' },
          sexo: { type: 'string', enum: ['H', 'M'], example: 'H' },
          fecha_nacimiento: { type: 'string', format: 'date', nullable: true, example: '2021-03-12' },
          color: { type: 'string', nullable: true, example: 'Dorado' },
          peso: { type: 'number', format: 'float', nullable: true, example: 28.5 },
          foto: { type: 'string', nullable: true, example: 'https://ejemplo.com/luna.jpg' },
          id_tipo_mascota: { type: 'integer', example: 1 },
          id_usuario: { type: 'integer', example: 2 }
        }
      },
      Cuidado: {
        type: 'object',
        properties: {
          id_cuidado: { type: 'integer', example: 2 },
          id_mascota: { type: 'integer', example: 1 },
          tipo_cuidado: { type: 'string', enum: ['Vacuna', 'Baño'], example: 'Vacuna' },
          fecha: { type: 'string', format: 'date', example: '2025-10-02' },
          detalle: { type: 'string', example: 'Parvovirus' },
          proxima_fecha: { type: 'string', format: 'date', nullable: true, example: '2026-12-02' },
          responsable: { type: 'string', nullable: true, example: 'Dra. Rojas' },
          observaciones: { type: 'string', nullable: true, example: 'Sin reacciones adversas' }
        }
      },
      TipoMascota: {
        type: 'object',
        properties: {
          id_tipo_mascota: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Perro' }
        }
      },
      TipoUsuario: {
        type: 'object',
        properties: {
          id_tipo_usuario: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Administrador' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mascota no encontrada.' },
          mensaje: { type: 'string', example: 'Error al obtener las mascotas' },
          detalle: { type: 'string', description: 'Mensaje interno del error (solo en fallos 500)' }
        }
      },
      Mensaje: {
        type: 'object',
        properties: {
          mensaje: { type: 'string', example: 'Mascota eliminada con éxito' }
        }
      },
      Sesion: {
        type: 'object',
        properties: {
          mensaje: { type: 'string', example: 'Inicio de sesión exitoso' },
          usuario: { $ref: '#/components/schemas/Usuario' },
          token: {
            type: 'string',
            description: 'JWT para el encabezado Authorization, válido 8 horas',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Datos inválidos o faltantes',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      },
      Unauthorized: {
        description: 'Falta el token, es inválido o está vencido. También credenciales incorrectas en el login',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      },
      Forbidden: {
        description: 'El token es válido pero el recurso pertenece a otro usuario',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      },
      ServerError: {
        description: 'Error interno del servidor',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      }
    }
  }
};

const swaggerSpec = swaggerJsdoc({
  definition,
  apis: [routesGlob]
});

module.exports = swaggerSpec;
