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
| Frontend | HTML + CSS estático servido desde `public/` (`index.html`, `mascotas.html`, `mascota.html`) |
| Hash de contraseñas | bcrypt / bcryptjs |
| Autenticación | JWT (`jsonwebtoken`, 8 horas, `Authorization: Bearer <token>`) |
| Documentación | OpenAPI 3.0.3 + Swagger UI (`swagger-jsdoc`, `swagger-ui-express`) |
| Pruebas | Jest 30 + Supertest 7 (modelos mockeados, sin base de datos) |
| Pruebas de carga | Grafana k6 |
| Cliente de API | Colección de Postman |

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
| `JWT_SECRET` | Secreto usado para firmar y verificar los tokens | `cambiar-por-un-secreto-largo-y-aleatorio` |

> `JWT_SECRET` **debe cambiarse** en cualquier entorno que no sea local. Si falta, el middleware usa el valor por defecto `clave-de-desarrollo-cambiar`, que está en el código y no protege nada. Cambiarlo invalida todos los tokens emitidos.

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

| Correo | Contraseña | Tipo | Mascotas |
| --- | --- | --- | --- |
| `carlos.ruiz@correo.com` | `123456` | Administrador (`id_tipo_usuario = 1`) | 1 |
| `eilyn.angarita@correo.com` | `123456` | Usuario | 1 |
| `maria.perez@correo.com` | `123456` | Usuario | 6 |
| `jose.martinez@correo.com` | `123456` | Usuario | 2 |
| `ana.gomez@correo.com` | `123456` | Usuario | 1 |

Las cinco contraseñas están guardadas como **hash bcrypt** (coste 10) del mismo `123456`, así que el login funciona con todas. Los usuarios nuevos se crean desde `POST /api/usuarios/registro` y siempre con tipo Usuario: el cliente no puede elegir el rol.

> Estas credenciales son datos de prueba de desarrollo. Para producción hay que cambiarlas y definir un `JWT_SECRET` propio.

---

## Endpoints de la API

Base: `/api`. Los marcados con 🔒 requieren `Authorization: Bearer <token>`; el resto son públicos.

### Usuarios

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/usuarios/registro` | Registra un usuario, encripta la contraseña y devuelve un token |
| `POST` | `/api/usuarios/login` | Valida credenciales con bcrypt y devuelve un token |
| `GET` 🔒 | `/api/usuarios/:id_usuario` | Perfil del usuario del token (sin contraseña) |
| `GET` 🔒 | `/api/usuarios/:id_usuario/mascotas` | Mascotas del token con su historial de cuidados |

### Mascotas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` 🔒 | `/api/mascotas` | Crea una mascota del usuario autenticado |
| `PUT` 🔒 | `/api/mascotas/:id_mascota` | Actualiza una mascota propia |
| `DELETE` 🔒 | `/api/mascotas/:id_mascota` | Elimina una mascota propia |
| `GET` 🔒 | `/api/mascotas/:id_mascota/cuidados` | Historial de cuidados de una mascota propia |

### Cuidados

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` 🔒 | `/api/cuidados` | Registra una vacuna o baño en una mascota propia |
| `PUT` 🔒 | `/api/cuidados/:id_cuidado` | Reemplaza un registro de cuidado |
| `PATCH` 🔒 | `/api/cuidados/:id_cuidado` | Actualiza campos parciales |
| `DELETE` 🔒 | `/api/cuidados/:id_cuidado` | Elimina un registro |

### Catálogos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/tipos-mascota` | Tipos de mascota |
| `GET` | `/api/tipos-usuario` | Tipos de usuario |

### Ejemplo

```bash
# 1. Login: guarda el token de la respuesta
curl -X POST http://localhost:3000/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"eilyn.angarita@correo.com","contrasena":"123456"}'

# 2. Usar el token en una ruta protegida
curl http://localhost:3000/api/usuarios/6/mascotas \
  -H "Authorization: Bearer <token>"
```

> `GET /api/usuarios/:id_usuario/mascotas` anida el historial bajo la clave **`Cuidados`** (con mayúscula inicial): es el alias que Sequelize genera para el `include` al no declararse un `as`. No es `cuidados` en minúscula.

---

## Autenticación (JWT)

El login y el registro devuelven un `token` firmado con `JWT_SECRET`, válido **8 horas**, con el payload `{ id_usuario, id_tipo_usuario }`.

El middleware `middleware/auth.js` valida `Authorization: Bearer <token>` y deja el usuario en `req.usuario`. Sin token, con token vencido o firmado con otro secreto responde:

| Situación | Código | Mensaje |
| --- | --- | --- |
| Falta el encabezado o no es `Bearer` | `401` | `Debes iniciar sesión.` |
| Token inválido o vencido | `401` | `Sesión inválida o vencida. Vuelve a iniciar sesión.` |
| Credenciales incorrectas en el login | `401` | `Credenciales inválidas.` |
| Recurso de otro usuario | `403` | `No puedes ver el perfil de otro usuario.` (o el equivalente) |

Tres decisiones de diseño que conviene entender:

1. **El dueño sale del token, nunca del cuerpo.** `POST /api/mascotas` ignora `id_usuario`; `PUT /api/mascotas/:id` ignora `id_usuario` e `id_mascota`. Así nadie puede reasignar una mascota ajena cambiando un JSON.
2. **El login no filtra qué correos existen.** Correo inexistente y contraseña incorrecta devuelven el mismo mensaje: `Credenciales inválidas.`
3. **Un recurso ajeno responde `404`, no `403`.** Para mascotas y cuidados, la API se comporta como si no existieran: no confirma la existencia de datos de otro usuario. El `403` queda para el perfil y las listas, donde el id es explícito en la URL.

El registro **siempre** crea tipo Usuario (`id_tipo_usuario = 2`); el rol no se puede elegir desde el cliente.

---

## Documentación de la API (Swagger)

La API está documentada con **OpenAPI 3.0.3** y se sirve con Swagger UI.

| Recurso | URL |
| --- | --- |
| Swagger UI (interactiva) | <http://localhost:3000/api-docs> |
| Especificación OpenAPI en JSON | <http://localhost:3000/api-docs.json> |

La especificación se arma en tiempo de arranque con `swagger-jsdoc`: la definición base (título, servidores, esquemas y respuestas reutilizables) vive en `config/swagger.js` y cada endpoint se documenta con un bloque `@openapi` encima de su ruta en `routes/api.js`. Al cambiar una ruta hay que actualizar su bloque: la documentación no se genera desde el código, se lee de esos comentarios.

Las 11 rutas documentadas cubren las 14 operaciones registradas (algunos paths comparten `PUT`/`DELETE`/`PATCH`). Cada operación declara su `security`: las 4 públicas (registro, login y catálogos) lo desactivan explícitamente y el resto hereda el esquema `bearerAuth`.

### Probar un endpoint desde Swagger UI

1. Abrir <http://localhost:3000/api-docs>
2. Ejecutar `POST /api/usuarios/login` con un usuario de prueba y **copiar el campo `token`** de la respuesta
3. Pulsar **Authorize** (arriba a la derecha) y pegar el token
4. Desplegar el endpoint protegido, pulsar **Try it out**, editar el JSON y **Execute**

Los endpoints escriben en la base real del contenedor, no en una copia: los `POST`, `PUT`, `PATCH` y `DELETE` que se ejecutan desde ahí modifican los datos de desarrollo.

---

## Pruebas

El proyecto usa **Jest** + **Supertest** para pruebas de la API. Los modelos de Sequelize se **mockean**, así que la suite no abre conexión a MySQL ni toca datos: se puede correr con el contenedor apagado.

```bash
npm test              # suite completa
npm run test:watch    # modo interactivo
npm run test:coverage # suite + reporte de cobertura
```

**52 pruebas en 4 suites**, agrupadas por dominio:

| Suite | Qué cubre |
| --- | --- |
| `tests/auth.test.js` | Registro, login y el middleware JWT: sin token, token inválido, vencido, firmado con otro secreto |
| `tests/usuarios.test.js` | Perfil y mascotas del usuario, con el control de permisos (`403` si pide otro) |
| `tests/mascotas.test.js` | CRUD de mascotas y propiedad del recurso (dueño desde el token) |
| `tests/cuidados.test.js` | CRUD de cuidados, catálogos y la especificación OpenAPI |

Cada endpoint tiene su caso feliz y sus ramas de error principales (`400` por datos inválidos, `401` por falta de token, `403` por permisos, `404` por recurso inexistente o ajeno, y `500` cuando la base falla).

La infraestructura de las pruebas vive en `tests/helpers/`:

- `modelos.js` — mocks de los modelos y fábricas de instancias falsas con la forma que devolvería Sequelize (`toJSON()`, `update()`, `destroy()`).
- `auth.js` — firma tokens JWT reales con el secreto de prueba, para no mockear el middleware.
- `tests/setup.js` — define `JWT_SECRET` **antes** de cargar `app.js`: el middleware lee la variable al importarse.

### Cobertura

El reporte se genera en `coverage/` (`index.html` navegable y `lcov.info`). Está en `.gitignore` porque es un artefacto derivado: se regenera con `npm run test:coverage`.

```bash
npm run test:coverage          # genera el reporte y lo imprime en consola
start coverage/index.html      # Windows: abre el reporte HTML navegable
open coverage/index.html       # macOS / Linux
```

El reporte HTML permite navegar archivo por archivo y ver exactamente qué líneas quedaron sin ejecutar; `coverage/lcov.info` es el formato que consumen herramientas externas (SonarQube, Codecov, la extensión Coverage Gutters de VS Code).

| Archivo | Sentencias | Ramas | Funciones | Líneas |
| --- | --- | --- | --- | --- |
| `app.js` | 100% | 100% | 100% | 100% |
| `config/swagger.js` | 100% | 50% | 100% | 100% |
| `middleware/auth.js` | 100% | 87.5% | 100% | 100% |
| `routes/api.js` | 93.05% | 98.3% | 100% | 92.95% |
| **Total** | **94.44%** | **95.65%** | **100%** | **94.35%** |

Dos aclaraciones sobre esos números:

- **Los modelos no se cuentan**: se mockean por diseño, así que reportarían 0% sin decir nada útil. `config/bd.js` tampoco se incluye porque solo se ejecuta contra una base real.
- **Las líneas sin cubrir de `routes/api.js` son los `catch` genéricos que devuelven `500`.** No queda código muerto: las rutas duplicadas que antes inflaban ese listado se eliminaron en la reescritura con JWT.

### Verificación de que la suite no pasa de casualidad

Se comprobó con dos mutaciones sobre `routes/api.js`:

1. **Quitar `verificarToken` de `GET /api/usuarios/:id_usuario`** → 11 pruebas en rojo (todo el bloque del middleware y los permisos).
2. **Invertir la condición de `bcrypt.compare` en el login** (verificación anterior, con la suite sin JWT) → 2 pruebas en rojo.

En ambos casos, restaurado el código, la suite vuelve a verde:

```text
Test Suites: 4 passed, 4 total
Tests:       52 passed, 52 total
```

---

## Pruebas de carga (k6)

`k6/api-stress.js` es una prueba de **stress** con Grafana k6: sube de 0 a 200 usuarios virtuales y mide latencia y errores por endpoint.

La prueba es de **solo lectura** a propósito: no crea ni modifica datos. El único `POST` es el login, que valida con bcrypt pero no escribe. Así se puede correr contra la base de desarrollo sin ensuciarla ni romper el índice único de correos.

### Instalar k6

```bash
winget install k6 --source winget   # Windows
brew install k6                     # macOS
```

O usarlo con Docker, sin instalar nada (ver más abajo).

### Ejecutar

```bash
npm run test:stress

# Versión corta para un smoke test de 8 segundos
k6 run --stage 5s:10 --stage 3s:0 k6/api-stress.js

# Con Docker (la API corre en el host, el contenedor la alcanza por host.docker.internal)
docker run --rm -v "${PWD}/k6:/scripts" -e BASE_URL=http://host.docker.internal:3000 \
  grafana/k6 run /scripts/api-stress.js
```

### Perfil de carga

| Etapa | Duración | Usuarios virtuales | Objetivo |
| --- | --- | --- | --- |
| Calentamiento | 30s | 0 → 20 | Estabilizar JIT y pool de conexiones |
| Carga normal | 1m | 20 → 50 | Línea base de latencia |
| Stress | 1m | 50 → 100 | Buscar el punto de degradación |
| Pico | 30s | 100 → 200 | Comportamiento bajo saturación |
| Recuperación | 30s | 200 → 0 | Verificar que vuelve solo |

Total: 3m 30s, con `gracefulRampDown` de 10s.

### Umbrales

Si un umbral se cruza, k6 termina con código de salida `99` y el run queda como fallido (sirve para CI).

| Métrica | Umbral | Por qué |
| --- | --- | --- |
| `http_req_failed` | `rate<0.01` | Menos del 1% de errores |
| `http_req_duration` | `p(95)<500`, `p(99)<1500` | Latencia global |
| `http_req_duration{endpoint:catalogos}` | `p(95)<300` | Consultas sin joins |
| `http_req_duration{endpoint:perfil}` | `p(95)<400` | Perfil y mascotas con `include` |
| `http_req_duration{endpoint:login}` | `p(95)<900` | bcrypt consume CPU real |
| `checks` | `rate>0.99` | Los `check()` deben pasar |

### Variables

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | Base de la API (`host.docker.internal` con Docker) |
| `USUARIO_CORREO` | `eilyn.angarita@correo.com` | Usuario de prueba |
| `USUARIO_CONTRASENA` | `123456` | Contraseña del usuario |

`setup()` valida que la API responda, hace **login y guarda el token JWT**, y resuelve los ids reales de usuario y mascota. Ese token se reutiliza en todas las iteraciones: firmar un JWT cuesta CPU, no tiene sentido hacerlo por request. Si el login falla, aborta con un mensaje claro antes de generar carga.

### Cómo leer el resultado

k6 imprime el resumen en consola: `http_reqs` (throughput), `http_req_duration` (percentiles), `http_req_failed` y el detalle por `endpoint:*`. Para guardar las métricas crudas:

```bash
k6 run --out json=resultado.json k6/api-stress.js
```

Referencia medida en local (Docker Desktop, 10 VUs, prueba corta): `86/86 checks` en verde, `0%` de errores, `p(95)` global de **10.68 ms** — con el login alrededor de 60 ms por el costo de bcrypt.

---

## Colección de Postman

La carpeta `postman/` trae la colección completa de la API lista para importar.

| Archivo | Contenido |
| --- | --- |
| `Huellitas-Digitales.postman_collection.json` | 15 requests en 5 carpetas, con cuerpos, cabeceras y tests |
| `Huellitas-Local.postman_environment.json` | `baseUrl`, `correo` y `contrasena` del entorno local |

### Importar

1. Postman → **Import** → arrastrar los dos archivos de `postman/`
2. Seleccionar el environment **Huellitas Digitales - Local** arriba a la derecha
3. Con la API levantada (`npm start`), ejecutar por carpeta o la colección completa con **Run**

### Qué incluye

- **Cuerpos completos** en cada `POST`/`PUT`/`PATCH`, con los campos obligatorios y opcionales del modelo.
- **Cabeceras** `Content-Type: application/json`, `Accept: application/json` y `Authorization: Bearer {{token}}` en las 10 peticiones protegidas.
- **Tests por request** (`pm.test`): código de estado, forma de la respuesta, emisión del token y que la contraseña nunca se devuelva.
- **Encadenado de variables**: `Login` (o `Registro`) guarda `token` e `idUsuario`, *Mascotas del usuario* guarda `idMascota`, *Crear mascota* guarda `idMascotaCreada` y *Crear cuidado* guarda `idCuidadoCreado`. Ejecutando en orden no hay que tocar nada a mano.
- **Correo único** por ejecución en el registro (pre-request script con `Date.now()`), para no chocar con el índice `UNIQUE` de `usuario.correo`.
- **Limpieza**: los `DELETE` de mascota y cuidado borran lo que creó la propia colección.

> El registro sí deja un usuario nuevo (`prueba.<timestamp>@correo.com`), porque la API no expone un endpoint para eliminar usuarios.

Verificado ejecutando las 15 peticiones contra la API real, en orden y con el token encadenado: **15/15 OK**. Además se comprobó que una ruta protegida sin token responde `401`.

---

## Estructura del proyecto

```text
├── bd/
│   └── huellitas_digitales (1).sql   # Dump de MySQL (init automático del contenedor)
├── config/
│   ├── bd.js                        # Instancia de Sequelize y verificación de conexión
│   └── swagger.js                   # Definición OpenAPI 3.0.3, esquemas y esquema bearerAuth
├── middleware/
│   └── auth.js                      # firmarToken() y verificarToken() (JWT)
├── models/
│   ├── index.js                     # Carga los modelos y define las asociaciones
│   ├── Usuario.js                   # tabla: usuario
│   ├── Mascota.js                   # tabla: mascotas
│   ├── Cuidado.js                   # tabla: cuidados
│   ├── TipoUsuario.js               # tabla: tipo_usuario
│   └── TipoMascota.js               # tabla: tipo_mascota
├── routes/
│   └── api.js                       # Los 14 endpoints REST + anotaciones @openapi
├── tests/
│   ├── setup.js                     # Define JWT_SECRET antes de cargar la app
│   ├── helpers/
│   │   ├── auth.js                  # Firma tokens reales para las pruebas
│   │   └── modelos.js               # Mocks de Sequelize e instancias falsas
│   ├── auth.test.js                 # Registro, login y middleware JWT
│   ├── usuarios.test.js             # Perfil y mascotas, con permisos
│   ├── mascotas.test.js             # CRUD de mascotas
│   └── cuidados.test.js             # Cuidados, catálogos y OpenAPI
├── public/
│   ├── index.html / mascotas.html / mascota.html
│   └── css/estilos.css
├── k6/
│   └── api-stress.js                # Prueba de stress (solo lectura, 200 VUs de pico)
├── postman/
│   ├── Huellitas-Digitales.postman_collection.json
│   └── Huellitas-Local.postman_environment.json
├── app.js                           # Configura Express (middlewares, estáticos, rutas) y se exporta
├── index.js                         # Arranque: conecta a MySQL y escucha en el puerto
├── docker-compose.yml               # MySQL 8.4 + importación del dump
└── .env.example                     # Plantilla de variables de entorno
```

`app.js` e `index.js` están separados a propósito: `app.js` exporta la app de Express sin escuchar, que es lo que consume Supertest; `index.js` es el que abre la conexión y levanta el servidor.

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Error crítico al conectar a MySQL` | El contenedor todavía no está listo | `docker compose ps` hasta ver `healthy` y reiniciar el servidor |
| `EADDRINUSE :::3306` | Otro MySQL local usa el puerto | Cambiar `DB_PORT` en `.env` (por ejemplo `3307`) |
| Las tablas no existen | El volumen ya existía cuando se agregó el dump | `docker compose down -v && docker compose up -d` |
| `Cannot find module 'express'` | Faltan dependencias | `npm install` |
| Error de encoding en los modelos | El archivo debe guardarse en UTF-8 | Verificar en el editor que `models/Cuidado.js` conserva `'Baño'` |
| Todo responde `401 Debes iniciar sesión.` | Falta el encabezado o el token expiró (8 h) | Volver a hacer login y usar el `token` nuevo |
| Todo responde `401 Sesión inválida o vencida.` | `JWT_SECRET` cambió o el token se firmó en otra instancia | Copiar el `JWT_SECRET` de `.env` (o volver a loguearse) |
| El login funciona pero `403` en las listas | El `id_usuario` de la URL no es el del token | Usar el `id_usuario` que devolvió el login |
| `403`/`404` al entrar a una mascota | La mascota pertenece a otro usuario | Cada usuario solo ve lo suyo, por diseño |

---

## Notas conocidas del código

- **Sin roles en la práctica:** existe `id_tipo_usuario` (1 = Administrador, 2 = Usuario) y va en el token, pero ningún endpoint lo usa todavía. El administrador hoy tiene los mismos permisos que un usuario común.
- **Sin refresh token ni logout del lado del servidor:** el JWT vive 8 horas y no hay lista de revocación. Para invalidar sesiones hay que cambiar `JWT_SECRET`, lo que vence todos los tokens.
- **El catálogo `tipo_mascota` no expone `descripcion`:** la columna existe en la tabla, pero el modelo Sequelize no la declara, así que no se selecciona.
