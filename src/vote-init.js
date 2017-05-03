/**
* @summary logs messages in user terminal
* @param {string} message text to be printed
* @param {object} params additional parameters
*/
const log = (message, params) => {
  let p;
  if (!params) { p = ''; } else { p = params; }
  console.log(message, p);
};

log('hello world');
