const app = require('./app');
const config = require('./config');
const busService = require('./services/bus.service');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(` TRAVA BACKEND SERVER - RUNNING`);
  console.log(` Port:    http://localhost:${PORT}`);
  console.log(` Health:  http://localhost:${PORT}/health`);
  console.log(` API:     http://localhost:${PORT}/api/v1`);
  console.log(` Bakery:  http://localhost:${PORT}/bakery`);
  console.log(` Tagline: "${config.branding.tagline}"`);
  console.log('====================================================');

  // Start background deterministic bus simulation
  busService.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down Trava backend...');
  busService.stop();
  server.close(() => {
    console.log('Server terminated.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  busService.stop();
  server.close(() => process.exit(0));
});

module.exports = server;
