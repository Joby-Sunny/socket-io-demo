const {jwt} = require('../libraries');
const constant = require('./util.constants');

module.exports.generateToken = payload => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {payload},
      constant.TOKEN_SECRET,
      {
        expiresIn: constant.TOKEN_EXPIRE_IN
      },
      (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      }
    );
  });
};

module.exports.verifyToken = token => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, constant.TOKEN_SECRET, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.payload);
      }
    });
  });
};
