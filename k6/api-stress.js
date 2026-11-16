// Prueba de stress de la API de Huellitas Digitales con Grafana k6.
//
// La API usa JWT: setup() hace login y el token se reutiliza en todas las
// iteraciones (firmar el token cuesta CPU, no tiene sentido por request).
//
// Uso local (k6 instalado):
//   k6 run k6/api-stress.js
//
// Uso con Docker (sin instalar k6):
//   docker run --rm -v "${PWD}/k6:/scripts" -e BASE_URL=http://host.docker.internal:3000 grafana/k6 run /scripts/api-stress.js
//
// Variables de entorno:
//   BASE_URL            URL base de la API           (por defecto http://localhost:3000)
//   USUARIO_CORREO      correo del usuario de prueba  (por defecto eilyn.angarita@correo.com)
//   USUARIO_CONTRASENA  contrasena del usuario        (por defecto 123456)
//
// La prueba es de solo lectura: no crea ni modifica datos. El único POST es el login,
// que valida credenciales con bcrypt y emite un token, pero no escribe en la base.

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USUARIO_CORREO = __ENV.USUARIO_CORREO || 'eilyn.angarita@correo.com';
const USUARIO_CONTRASENA = __ENV.USUARIO_CONTRASENA || '123456';

const CABECERAS_JSON = { headers: { 'Content-Type': 'application/json' } };

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // calentamiento
        { duration: '1m', target: 50 },   // carga normal
        { duration: '1m', target: 100 },  // zona de stress
        { duration: '30s', target: 200 }, // pico
        { duration: '30s', target: 0 }    // recuperación
      ],
      gracefulRampDown: '10s'
    }
  },
  thresholds: {
    // Menos del 1% de las peticiones puede fallar
    http_req_failed: ['rate<0.01'],
    // Latencia global
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    // Latencia por endpoint (el login es más caro por el hash de bcrypt)
    'http_req_duration{endpoint:catalogos}': ['p(95)<300'],
    'http_req_duration{endpoint:perfil}': ['p(95)<400'],
    'http_req_duration{endpoint:login}': ['p(95)<900'],
    // Todas las comprobaciones deben pasar
    checks: ['rate>0.99']
  }
};

// Verifica que la API responda y que el usuario de prueba pueda iniciar sesión.
// Devuelve el token y los ids reales para no hardcodear datos.
export function setup() {
  const salud = http.get(`${BASE_URL}/api/tipos-mascota`, {
    tags: { endpoint: 'catalogos' }
  });

  if (salud.status !== 200) {
    throw new Error(
      `La API no responde en ${BASE_URL} (status ${salud.status}). ¿Está levantada con npm start?`
    );
  }

  const login = http.post(
    `${BASE_URL}/api/usuarios/login`,
    JSON.stringify({ correo: USUARIO_CORREO, contrasena: USUARIO_CONTRASENA }),
    CABECERAS_JSON
  );

  if (login.status !== 200) {
    throw new Error(
      `El usuario ${USUARIO_CORREO} no puede iniciar sesión (status ${login.status}). ` +
        'Revisá las credenciales en el README o recargá el dump con docker compose down -v.'
    );
  }

  const token = login.json('token');
  const idUsuario = login.json('usuario.id_usuario');

  if (!token) {
    throw new Error('El login no devolvió token: revisá JWT_SECRET en .env');
  }

  const mascotas = http.get(`${BASE_URL}/api/usuarios/${idUsuario}/mascotas`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { endpoint: 'perfil' }
  });

  if (mascotas.status !== 200 || !mascotas.json().length) {
    throw new Error(`El usuario ${idUsuario} no tiene mascotas: revisá los datos de prueba.`);
  }

  return {
    token,
    idUsuario,
    idMascota: mascotas.json()[0].id_mascota
  };
}

export default function (datos) {
  const conToken = {
    headers: { Authorization: `Bearer ${datos.token}` }
  };

  // Mezcla de lecturas: las de catálogo y perfil son baratas,
  // el login es el endpoint más costoso y por eso pesa menos.
  const tirada = Math.random();

  if (tirada < 0.30) {
    group('catálogos', () => {
      const respuesta = http.get(`${BASE_URL}/api/tipos-mascota`, {
        tags: { endpoint: 'catalogos' }
      });

      check(respuesta, {
        'tipos-mascota responde 200': (r) => r.status === 200,
        'tipos-mascota devuelve datos': (r) => Array.isArray(r.json()) && r.json().length > 0
      });
    });
  } else if (tirada < 0.45) {
    group('catálogos', () => {
      const respuesta = http.get(`${BASE_URL}/api/tipos-usuario`, {
        tags: { endpoint: 'catalogos' }
      });

      check(respuesta, {
        'tipos-usuario responde 200': (r) => r.status === 200
      });
    });
  } else if (tirada < 0.65) {
    group('perfil', () => {
      const respuesta = http.get(`${BASE_URL}/api/usuarios/${datos.idUsuario}`, {
        headers: conToken.headers,
        tags: { endpoint: 'perfil' }
      });

      check(respuesta, {
        'perfil responde 200': (r) => r.status === 200,
        'perfil no expone la contrasena': (r) => r.json('contrasena') === undefined
      });
    });
  } else if (tirada < 0.85) {
    group('perfil', () => {
      const respuesta = http.get(`${BASE_URL}/api/usuarios/${datos.idUsuario}/mascotas`, {
        headers: conToken.headers,
        tags: { endpoint: 'perfil' }
      });

      check(respuesta, {
        'mascotas del usuario responden 200': (r) => r.status === 200,
        'mascotas incluyen cuidados': (r) => Array.isArray(r.json()[0].Cuidados)
      });
    });
  } else if (tirada < 0.93) {
    group('historial', () => {
      const respuesta = http.get(`${BASE_URL}/api/mascotas/${datos.idMascota}/cuidados`, {
        headers: conToken.headers,
        tags: { endpoint: 'historial' }
      });

      check(respuesta, {
        'historial responde 200': (r) => r.status === 200,
        'historial trae el total': (r) => typeof r.json('total_cuidados') === 'number'
      });
    });
  } else {
    group('login', () => {
      const respuesta = http.post(
        `${BASE_URL}/api/usuarios/login`,
        JSON.stringify({ correo: USUARIO_CORREO, contrasena: USUARIO_CONTRASENA }),
        { ...CABECERAS_JSON, tags: { endpoint: 'login' } }
      );

      check(respuesta, {
        'login responde 200': (r) => r.status === 200,
        'login devuelve token': (r) => typeof r.json('token') === 'string'
      });
    });
  }

  sleep(0.5 + Math.random());
}
