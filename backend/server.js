// Backend Entry File Bridge
const path = require('path');
const distPath = path.resolve(__dirname, 'dist/server.js');
module.exports = require(distPath);

