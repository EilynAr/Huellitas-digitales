const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/bd');
const Usuario = require('./Usuario');

const Mascota = sequelize.define('Mascota', {
  id_mascota: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  raza: { type: DataTypes.STRING(50), allowNull: true },
  sexo: { 
    type: DataTypes.ENUM('H', 'M'), 
    allowNull: false 
  },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  color: { type: DataTypes.STRING(30), allowNull: true },
  peso: { 
    type: DataTypes.DECIMAL(5, 2), 
    allowNull: true,
    validate: { min: 0.01 }
  },
  foto: { type: DataTypes.STRING(255), allowNull: true },
  id_tipo_mascota: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'mascotas',
  timestamps: false
});

// Relaciones
Usuario.hasMany(Mascota, { foreignKey: 'id_usuario' });
Mascota.belongsTo(Usuario, { foreignKey: 'id_usuario' });

module.exports = Mascota;
