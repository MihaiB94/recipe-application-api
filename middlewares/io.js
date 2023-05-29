const server = require('http').createServer();
const io = require('socket.io')(server, {
   cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
   }
});

module.exports = io;
