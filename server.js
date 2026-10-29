// Repository Root Entry File Bridge for Hostinger deployments
const path = require('path');
const fs = require('fs');

const backendDist = path.resolve(__dirname, 'backend/dist/server.js');
const rootDist = path.resolve(__dirname, 'dist/server.js');

if (fs.existsSync(backendDist)) {
  module.exports = require(backendDist);
} else if (fs.existsSync(rootDist)) {
  module.exports = require(rootDist);
} else {
  console.error('Compiled server not found. Ensure "npm run build" has executed.');
  process.exit(1);
}

