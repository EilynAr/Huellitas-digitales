const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const apiRouter = require('./routes/api');

// Importar modelos (registra las asociaciones Sequelize)
require('./models');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Sirve index.html, mascotas.html, mascota.html y css/ desde public/

// Documentación de la API (Swagger UI) y especificación OpenAPI en JSON
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Huellitas Digitales API'
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Rutas de la API
app.use('/api', apiRouter);

// La app se exporta sin escuchar: index.js arranca el servidor y las pruebas usan supertest
module.exports = app;