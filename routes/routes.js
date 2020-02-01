const {express, ioClient} = require('../libraries');
const logger = require('../utilities/logger');
const router = express.Router();

// router.use((req, res, next) => {
//   logger.info(req);
//   next();
// });

const clientSoc = ioClient('http://localhost:3000');

clientSoc.on('connect', function(soc) {
  logger.info('Node : Client soc connected');
});

clientSoc.on('disconnect', function() {
  logger.info('Node : Client soc disconnected');
});

router.post('/message', function(req, res) {
  const body = req.body;
  clientSoc.emit('customEvent', {message: body.message}, function(soc) {
    logger.info(JSON.stringify({'acknowledge is recieved': soc}));
    res.send(soc);
  });
});

module.exports = router;
