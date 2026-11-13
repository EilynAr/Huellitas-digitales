const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/bd');

const Usuario = sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  apellido: { type: DataTypes.STRING(50), allowNull: false },
  correo: { 
    type: DataTypes.STRING(100), 
    allowNull: false, 
    unique: true 
  },
  contrasena: { type: DataTypes.STRING(255), allowNull: false },
  id_tipo_usuario: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 2 
  }
}, {
  tableName: 'usuario',
  timestamps: false
});

module.exports = Usuario;
