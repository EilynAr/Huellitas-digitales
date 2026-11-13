const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/bd');

const TipoMascota = sequelize.define('TipoMascota', {
  id_tipo_mascota: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { // ⚠️ Verifica en phpMyAdmin si esta columna se llama 'nombre' o 'descripcion'
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'tipo_mascota',
  timestamps: false
});

module.exports = TipoMascota;
