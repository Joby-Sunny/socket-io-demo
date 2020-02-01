const constant = require('./util.constants');
// to set message;
module.exports.grabMessage = error => {
  if (typeof error === constant.OBJECT) {
    return getFromObject(error);
  } else {
    return defaultMessage();
  }
};

function getFromObject(error) {
  if (error.hasOwnProperty(constant.MESSAGE)) {
    return error[constant.MESSAGE];
  } else {
    return defaultMessage();
  }
}

function defaultMessage() {
  return constant.DEFAULT_ERROR_MESSAGE;
}

// to get datavalue from sequelize response

module.exports.getValues = (modelResponse, keysToFetch) => {
  const {dataValues} = modelResponse;
  const valueObject = {};
  for (let key of keysToFetch) {
    valueObject[key] = (dataValues && dataValues[key]) || null;
  }
  return valueObject;
};
