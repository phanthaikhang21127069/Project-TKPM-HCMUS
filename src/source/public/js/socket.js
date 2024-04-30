// Singleton Pattern
// socket.js
const socketIo = require('socket.io');
let io;

const initIo = (server) => {
  io = socketIo(server);
  setEventHandlers(io);
};

const setEventHandlers = (io) => {
//   io.on('connection', (socket) => {
//     console.log('A user connected');
//     socket.on('disconnect', () => {
//       console.log('User disconnected');
//     });
//   });
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initIo, getIo };
