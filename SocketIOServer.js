const {ioServer} = require('./libraries');
const logger = require('./utilities/logger');

ioServer.on('connection', function(socket) {
  logger.info('Node Server : A User connected');

  socket.on('disconnect', function() {
    logger.info('Node Server : A User diconnected');
  });

  socket.on('customEvent', function(msg, next) {
    logger.info('Custom message is recieved :' + JSON.stringify(msg));
    next({ack: 'the message recieved'});
  });
});
