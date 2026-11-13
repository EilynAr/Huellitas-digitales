const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/bd');

const TipoUsuario = sequelize.define('TipoUsuario', {
  id_tipo_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { // ⚠️ Verifica en phpMyAdmin si esta columna se llama 'nombre' o 'rol'
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'tipo_usuario',
  timestamps: false
});

module.exports = TipoUsuario;
