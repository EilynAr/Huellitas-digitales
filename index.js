require('dotenv').config();

const app = require('./app');
const { conectarDB } = require('./config/bd');

const port = process.env.PORT || 3000;

// Conexión a la base de datos
conectarDB();

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log(`Documentación de la API en http://localhost:${port}/api-docs`);
});
