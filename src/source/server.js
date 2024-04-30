const database = require('../config/db.config');
const { app, server } = require('./app');
const { initIo } = require('./public/js/socket');

database.connect();
const port = process.env.PORT || 3000;

// Use 'server.listen' instead of 'app.listen'
server.listen(port, '127.0.0.1', () => {
    console.log(`App is running on port ${port} ...`);
    initIo(server);  // Initialize Socket.IO with the server
});