var app = require('express')();
const bodyParser = require('body-parser');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(bodyParser.json());

const ioClient = require('socket.io-client');
const clientSoc = ioClient('http://localhost:3000');

clientSoc.on('connect', function(soc) {
  console.log('client soc connnected');
});

clientSoc.on('disconnect', function() {
  console.log('Client soc disconnected');
});

app.post('/message', function(req, res) {
  const body = req.body;
  console.log(req.body);
  console.log('\n\n\n\n', Object.keys(req));
  clientSoc.emit('customEvent', {message: body.message}, function(soc) {
    console.log('acknowledge is recieved', soc);
    res.send(soc);
  });
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  console.log('a user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
  socket.on('customEvent', function(msg) {
    console.log('\n\n\nmessage', msg);
  });
  socket.on('chat message', function(msg) {
    console.log('\n\n\nmessage', msg);
  });
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});
