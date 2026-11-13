const express = require('express');
const cors = require('cors');
const app = express();
const apiRouter = require('./routes/api');
const { conectarDB } = require('./config/bd');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

// Importar modelos para definir relaciones
const Usuario = require('./models/Usuario');
const Mascota = require('./models/Mascota');
const Cuidado = require('./models/Cuidado');

// Definir asociaciones entre tablas
Usuario.hasMany(Mascota, { foreignKey: 'id_usuario' });
Mascota.belongsTo(Usuario, { foreignKey: 'id_usuario' });

Mascota.hasMany(Cuidado, { foreignKey: 'id_mascota' });
Cuidado.belongsTo(Mascota, { foreignKey: 'id_mascota' });

const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Permite abrir tus archivos .html desde localhost:3000

// Documentación de la API (Swagger UI) y especificación OpenAPI en JSON
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Huellitas Digitales API'
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Conexión a la base de datos
conectarDB();

// Rutas de la API
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log(`Documentación de la API en http://localhost:${port}/api-docs`);
});
