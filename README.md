# Huellitas Digitales

Aplicación web para registrar usuarios, mascotas y su historial de cuidados (vacunas y baños).
Backend en Node.js + Express 5 + Sequelize, con MySQL 8.4 ejecutándose en Docker y frontend en HTML/CSS estático servido por el mismo servidor.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Runtime | Node.js 22 (CommonJS) |
| Servidor HTTP | Express 5 |
| ORM | Sequelize 6 |
| Base de datos | MySQL 8.4 (`mysql2`) |
| Contenedor de BD | Docker Compose |
| Frontend | HTML + CSS estático (`index.html`, `mascotas.html`, `mascota.html`) |
| Hash de contraseñas | bcrypt / bcryptjs |
| Documentación | OpenAPI 3.0.3 + Swagger UI (`swagger-jsdoc`, `swagger-ui-express`) |

---

## Requisitos

- Node.js 20 o superior
- Docker Desktop con Docker Compose v2
- Puertos libres: `3000` (API/web) y `3306` (MySQL)

---

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env        # Windows: copy .env.example .env

# 2. Base de datos (crea el contenedor e importa bd/huellitas_digitales (1).sql)
docker compose up -d

# 3. Dependencias
npm install

# 4. Servidor
npm run dev                 # con recarga automática
# o
npm start
```

La aplicación queda disponible en <http://localhost:3000> y la API en <http://localhost:3000/api>.
La documentación interactiva de la API está en <http://localhost:3000/api-docs>.

El contenedor queda marcado como `healthy` cuando MySQL termina de inicializar. Para confirmarlo:

```bash
docker compose ps
```

### Variables de entorno

Todas se leen desde `.env` (ignorado por Git) y son compartidas por la aplicación y por `docker compose`.

| Variable | Descripción | Valor por defecto en `.env.example` |
| --- | --- | --- |
| `DB_NAME` | Nombre de la base de datos | `huellitas_digitales` |
| `DB_USER` | Usuario de la aplicación | `huellitas` |
| `DB_PASSWORD` | Contraseña del usuario de la aplicación | `huellitas_dev` |
| `DB_ROOT_PASSWORD` | Contraseña de `root` en el contenedor | `huellitas_root_dev` |
| `DB_HOST` | Host de la base de datos | `127.0.0.1` |
| `DB_PORT` | Puerto publicado de MySQL | `3306` |
| `PORT` | Puerto del servidor Express | `3000` |

> `MYSQL_USER` de la imagen oficial de MySQL no acepta `root`. El usuario `root` del contenedor existe solo para administración; la aplicación usa `DB_USER`.

### Importación de la base de datos

`docker-compose.yml` monta el directorio `bd/` en `/docker-entrypoint-initdb.d`, por lo que **los archivos `.sql` se ejecutan automáticamente la primera vez que se crea el volumen**.

Si se modifica el dump o se agregan tablas, hay que recrear el volumen:

```bash
docker compose down -v
docker compose up -d
```

> `docker compose down -v` **elimina todos los datos** del contenedor.

### Datos de prueba

El dump incluye catálogos (`tipo_mascota`, `tipo_usuario`), usuarios, mascotas y cuidados de ejemplo.

| Correo | Contraseña | Tipo |
| --- | --- | --- |
| `eilyn.angarita@correo.com` | `123456` | Usuario (hash bcrypt válido) |
| `carlos.ruiz@correo.com` | `123456` | Administrador |
| `maria.perez@correo.com` | `123456` | Usuario |

Los usuarios heredados del dump guardan la contraseña en texto plano, por lo que **solo sirven para pruebas**: el login compara con `bcrypt.compare` y fallará para ellos. Los usuarios creados desde `POST /api/usuarios/registro` sí se almacenan con hash.

---

## Endpoints de la API

Base: `/api`

### Usuarios

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/usuarios/registro` | Registra un usuario y encripta la contraseña |
| `POST` | `/api/usuarios/login` | Valida credenciales con bcrypt |
| `GET` | `/api/usuarios/:id_usuario` | Perfil del usuario (sin contraseña) |
| `GET` | `/api/usuarios/:id_usuario/mascotas` | Mascotas del usuario con su historial de cuidados |

### Mascotas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/mascotas` | Crea una mascota |
| `PUT` | `/api/mascotas/:id_mascota` | Actualiza una mascota |
| `DELETE` | `/api/mascotas/:id_mascota` | Elimina una mascota |
| `GET` | `/api/mascotas/:id_mascota/cuidados` | Historial de cuidados de la mascota |

### Cuidados

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/cuidados` | Registra una vacuna o baño |
| `PUT` | `/api/cuidados/:id_cuidado` | Reemplaza un registro de cuidado |
| `PATCH` | `/api/cuidados/:id_cuidado` | Actualiza campos parciales |
| `DELETE` | `/api/cuidados/:id_cuidado` | Elimina un registro |

### Catálogos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/tipos-mascota` | Tipos de mascota |
| `GET` | `/api/tipos-usuario` | Tipos de usuario |

### Ejemplo

```bash
curl -X POST http://localhost:3000/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"eilyn.angarita@correo.com","contrasena":"123456"}'
```

---

## Documentación de la API (Swagger)

La API está documentada con **OpenAPI 3.0.3** y se sirve con Swagger UI.

| Recurso | URL |
| --- | --- |
| Swagger UI (interactiva) | <http://localhost:3000/api-docs> |
| Especificación OpenAPI en JSON | <http://localhost:3000/api-docs.json> |

La especificación se arma en tiempo de arranque con `swagger-jsdoc`: la definición base (título, servidores, esquemas y respuestas reutilizables) vive en `config/swagger.js` y cada endpoint se documenta con un bloque `@openapi` encima de su ruta en `routes/api.js`. Al cambiar una ruta hay que actualizar su bloque: la documentación no se genera desde el código, se lee de esos comentarios.

Las 11 rutas documentadas cubren las 14 operaciones registradas (algunos paths comparten `PUT`/`DELETE`/`PATCH`). Las rutas duplicadas del final de `routes/api.js` no se documentan porque nunca se ejecutan.

### Probar un endpoint desde Swagger UI

1. Abrir <http://localhost:3000/api-docs>
2. Desplegar el endpoint (por ejemplo `POST /api/usuarios/login`) y pulsar **Try it out**
3. Editar el JSON de ejemplo y pulsar **Execute**

Los endpoints escriben en la base real del contenedor, no en una copia: los `POST`, `PUT`, `PATCH` y `DELETE` que se ejecutan desde ahí modifican los datos de desarrollo.

---

## Estructura del proyecto

```text
├── bd/
│   └── huellitas_digitales (1).sql   # Dump de MySQL (init automático del contenedor)
├── config/
│   ├── bd.js                        # Instancia de Sequelize y verificación de conexión
│   └── swagger.js                   # Definición OpenAPI 3.0.3 + esquemas reutilizables
├── models/
│   ├── Usuario.js                   # tabla: usuario
│   ├── Mascota.js                   # tabla: mascotas
│   ├── Cuidado.js                   # tabla: cuidados
│   ├── TipoUsuario.js               # tabla: tipo_usuario
│   └── TipoMascota.js               # tabla: tipo_mascota
├── routes/
│   └── api.js                       # Todos los endpoints REST
├── css/
│   └── estilos.css
├── index.html / mascotas.html / mascota.html
├── index.js                         # Punto de entrada: Express, estáticos y asociaciones
├── docker-compose.yml               # MySQL 8.4 + importación del dump
└── .env.example                     # Plantilla de variables de entorno
```

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Error crítico al conectar a MySQL` | El contenedor todavía no está listo | `docker compose ps` hasta ver `healthy` y reiniciar el servidor |
| `EADDRINUSE :::3306` | Otro MySQL local usa el puerto | Cambiar `DB_PORT` en `.env` (por ejemplo `3307`) |
| Las tablas no existen | El volumen ya existía cuando se agregó el dump | `docker compose down -v && docker compose up -d` |
| `Cannot find module 'express'` | Faltan dependencias | `npm install` |
| Error de encoding en los modelos | El archivo debe guardarse en UTF-8 | Verificar en el editor que `models/Cuidado.js` conserva `'Baño'` |

---

## Notas conocidas del código

- `routes/api.js` registra varias rutas duplicadas (`POST /usuarios/login`, `PUT|DELETE /mascotas/:id_mascota`, `PUT /cuidados/:id_cuidado`) y contiene dos `module.exports = router` intermedios. Express usa la primera coincidencia, así que las versiones posteriores son código muerto.
- No hay autenticación por token: el login devuelve los datos del usuario, pero los endpoints no están protegidos.
- No hay pruebas automatizadas (`npm test` sigue siendo el placeholder de npm).
