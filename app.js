const {express, bodyParser, cors, app, httpServer} = require('./libraries');
const loggeer = require('./utilities/logger');
const router = require('./routes/routes');
require('./SocketIOServer');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));
app.use('/', router);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '../index.html');
});

httpServer.listen(3000, function() {
  loggeer.info('listening on *:3000');
});
