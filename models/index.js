// Punto único de carga de modelos: requiere todos y define las asociaciones Sequelize.
// Es necesario que las asociaciones existan antes de usar `include` en las consultas.
const Usuario = require('./Usuario');
const Mascota = require('./Mascota');
const Cuidado = require('./Cuidado');
const TipoUsuario = require('./TipoUsuario');
const TipoMascota = require('./TipoMascota');

// Asociaciones entre tablas
Usuario.hasMany(Mascota, { foreignKey: 'id_usuario' });
Mascota.belongsTo(Usuario, { foreignKey: 'id_usuario' });

Mascota.hasMany(Cuidado, { foreignKey: 'id_mascota' });
Cuidado.belongsTo(Mascota, { foreignKey: 'id_mascota' });

module.exports = { Usuario, Mascota, Cuidado, TipoUsuario, TipoMascota };
