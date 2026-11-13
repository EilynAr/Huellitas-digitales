const { Sequelize } = require('sequelize');
require('dotenv').config();

// Inicializar la instancia de Sequelize con un Pool de conexiones optimizado
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Cambia a console.log si quieres ver las consultas SQL en la terminal
    pool: {
      max: 5,       // Máximo de conexiones simultáneas libres
      min: 0,       // Mínimo de conexiones abiertas
      acquire: 30000, // Tiempo máximo en milisegundos para conectar antes de lanzar error
      idle: 10000    // Tiempo de inactividad para liberar una conexión
    }
  }
);

// Función para verificar la conexión
const conectarDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa a MySQL con Sequelize.');
  } catch (error) {
    console.error('❌ Error crítico al conectar a MySQL:', error.message);
    process.exit(1); // Detiene la app si no se puede conectar
  }
};

module.exports = { sequelize, conectarDB };
