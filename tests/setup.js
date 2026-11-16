// Se ejecuta antes de cargar app.js en cada archivo de test.
// El middleware lee process.env.JWT_SECRET al importarse, así que el secreto
// tiene que estar definido ANTES de requerir la aplicación.
process.env.JWT_SECRET = 'secreto-de-prueba-no-usar-en-produccion';
process.env.NODE_ENV = 'test';
