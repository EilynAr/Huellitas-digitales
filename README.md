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

> `GET /api/usuarios/:id_usuario/mascotas` anida el historial bajo la clave **`Cuidados`** (con mayúscula inicial): es el alias que Sequelize genera para el `include` al no declararse un `as`. No es `cuidados` en minúscula.

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

## Pruebas

El proyecto usa **Jest** + **Supertest** para pruebas de la API. Los modelos de Sequelize se **mockean**, así que la suite no abre conexión a MySQL ni toca datos: se puede correr con el contenedor apagado.

```bash
npm test              # suite completa
npm run test:watch    # modo interactivo
npm run test:coverage # suite + reporte de cobertura
```

**30 pruebas en 3 suites**, agrupadas por dominio: `tests/usuarios.test.js`, `tests/mascotas.test.js` y `tests/cuidados.test.js` (este último cubre también catálogos y la especificación OpenAPI). Cada endpoint tiene su caso feliz y sus ramas de error principales (`400` por datos inválidos, `401` por credenciales, `404` por recurso inexistente y `500` cuando la base falla).

`tests/factories.js` arma instancias falsas de los modelos con la forma que devolvería Sequelize (incluido `toJSON()` y las instancias con `update`/`destroy`).

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
| `routes/api.js` | 71.51% | 80% | 77.77% | 71.51% |
| **Total** | **74.87%** | **78.84%** | **78.94%** | **74.74%** |

Dos aclaraciones sobre esos números:

- **Los modelos no se cuentan**: se mockean por diseño, así que reportarían 0% sin decir nada útil. `config/bd.js` tampoco se incluye porque solo se ejecuta contra una base real.
- **Las líneas sin cubrir de `routes/api.js` (632-654, 716-735, 799-827) son las rutas duplicadas del final del archivo**, que nunca se ejecutan. El resto son los `catch` genéricos que devuelven `500`. La documentación de esas rutas duplicadas tampoco se genera en Swagger por el mismo motivo.

### Verificación de que la suite no pasa de casualidad

Se comprobó con una mutación: al invertir la condición de `bcrypt.compare` en el login (`routes/api.js`), 2 pruebas pasaron a rojo. Restaurado el código, vuelven a 30/30 en verde.

```text
Test Suites: 3 passed, 3 total
Tests:       30 passed, 30 total
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

`setup()` valida que la API responda y que el usuario pueda iniciar sesión; si algo falla, aborta antes de generar carga con un mensaje claro. Los ids de usuario y mascota se resuelven en caliente, no están hardcodeados.

### Cómo leer el resultado

k6 imprime el resumen en consola: `http_reqs` (throughput), `http_req_duration` (percentiles), `http_req_failed` y el detalle por `endpoint:*`. Para guardar las métricas crudas:

```bash
k6 run --out json=resultado.json k6/api-stress.js
```

Referencia medida en local (Docker Desktop, 10 VUs, prueba corta): `p(95)` de 7 ms en catálogos, 12 ms en perfil y 60 ms en login — el login domina por el costo de bcrypt.

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
- **Cabeceras** `Content-Type: application/json` y `Accept: application/json`.
- **Tests por request** (`pm.test`): código de estado, forma de la respuesta y, sobre todo, que la contraseña nunca se devuelva.
- **Encadenado de variables**: el login guarda `idUsuario`, *Mascotas del usuario* guarda `idMascota`, *Crear mascota* guarda `idMascotaCreada` y *Crear cuidado* guarda `idCuidadoCreado`. Ejecutando en orden no hay que tocar nada a mano.
- **Correo único** por ejecución en el registro (pre-request script con `Date.now()`), para no chocar con el índice `UNIQUE` de `usuario.correo`.
- **Limpieza**: los `DELETE` de mascota y cuidado borran lo que creó la propia colección.

> El registro sí deja un usuario nuevo (`prueba.<timestamp>@correo.com`), porque la API no expone un endpoint para eliminar usuarios.

Verificado ejecutando las 15 peticiones contra la API real, en orden y con las variables encadenadas: **15/15 OK**.

---

## Estructura del proyecto

```text
├── bd/
│   └── huellitas_digitales (1).sql   # Dump de MySQL (init automático del contenedor)
├── config/
│   ├── bd.js                        # Instancia de Sequelize y verificación de conexión
│   └── swagger.js                   # Definición OpenAPI 3.0.3 + esquemas reutilizables
├── models/
│   ├── index.js                     # Carga los modelos y define las asociaciones
│   ├── Usuario.js                   # tabla: usuario
│   ├── Mascota.js                   # tabla: mascotas
│   ├── Cuidado.js                   # tabla: cuidados
│   ├── TipoUsuario.js               # tabla: tipo_usuario
│   └── TipoMascota.js               # tabla: tipo_mascota
├── routes/
│   └── api.js                       # Todos los endpoints REST + anotaciones @openapi
├── tests/
│   ├── factories.js                 # Instancias falsas de los modelos
│   ├── usuarios.test.js
│   ├── mascotas.test.js
│   └── cuidados.test.js             # Cuidados, catálogos y especificación OpenAPI
├── k6/
│   └── api-stress.js                # Prueba de stress (solo lectura, 200 VUs de pico)
├── postman/
│   ├── Huellitas-Digitales.postman_collection.json
│   └── Huellitas-Local.postman_environment.json
├── css/
│   └── estilos.css
├── index.html / mascotas.html / mascota.html
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

---

## Notas conocidas del código

- `routes/api.js` registra varias rutas duplicadas (`POST /usuarios/login`, `PUT|DELETE /mascotas/:id_mascota`, `PUT /cuidados/:id_cuidado`) y contiene dos `module.exports = router` intermedios. Express usa la primera coincidencia, así que las versiones posteriores son código muerto: no se ejecutan, no se documentan en Swagger y son las principales líneas sin cubrir del reporte de cobertura.
- No hay autenticación por token: el login devuelve los datos del usuario, pero los endpoints no están protegidos.
