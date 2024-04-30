// Consolidating error messages into a single string is a practical way to handle errors.
const { body, validationResult } = require('express-validator');

function getErrorMessage(req) {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let errorArray = errors.array();
    return errorArray.reduce((message, error) => {
      return message + error.msg + '<br/>';
    }, '');
  }
  return null;
}

module.exports = { body, getErrorMessage };
