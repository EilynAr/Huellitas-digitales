const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/bd');
const Mascota = require('./Mascota');

const Cuidado = sequelize.define('Cuidado', {
  id_cuidado: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_mascota: { type: DataTypes.INTEGER, allowNull: false },
  tipo_cuidado: { 
    type: DataTypes.ENUM('Vacuna', 'Baño'), 
    allowNull: false 
  },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  detalle: { type: DataTypes.STRING(80), allowNull: false },
  proxima_fecha: { type: DataTypes.DATEONLY, allowNull: true },
  responsable: { type: DataTypes.STRING(80), allowNull: true },
  observaciones: { type: DataTypes.STRING(255), allowNull: true }
}, {
  tableName: 'cuidados',
  timestamps: false
});

// Relaciones
Mascota.hasMany(Cuidado, { foreignKey: 'id_mascota' });
Cuidado.belongsTo(Mascota, { foreignKey: 'id_mascota' });

module.exports = Cuidado;
