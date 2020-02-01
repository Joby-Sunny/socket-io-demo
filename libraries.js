const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const httpServer = require('http').createServer(app);
const ioServer = require('socket.io')(httpServer);
const ioClient = require('socket.io-client');

module.exports = {
  express,
  bodyParser,
  cors,
  app,
  httpServer,
  ioServer,
  ioClient
};
