// Hostinger Entry File Bridge
// Handles deployments where Hostinger entry file is configured as src/server.js
const path = require('path');
const distPath = path.resolve(__dirname, '../dist/server.js');
module.exports = require(distPath);

