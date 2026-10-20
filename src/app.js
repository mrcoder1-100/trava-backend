const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const apiRouter = require('./routes');
const config = require('./config');

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// JSON body parsing with support for photo check base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Bakery Verification Webpage statically at /bakery
const bakeryWebDir = path.resolve(__dirname, '../../bakery-web');
app.use('/bakery', express.static(bakeryWebDir));
app.get('/partner', (req, res) => res.redirect('/bakery/partner.html'));
app.get('/partners', (req, res) => res.redirect('/bakery/partner.html'));

// Serve Trava IVR & Toll-Free Simulator at /ivr
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));
app.get('/ivr', (req, res) => res.sendFile(path.join(publicDir, 'ivr.html')));

// Root welcome & health check
app.get('/', (req, res) => {
  res.json({
    app: config.branding.appName,
    tagline: config.branding.tagline,
    subtitle: config.branding.subtitle,
    city: config.branding.city,
    status: 'ONLINE',
    version: '1.0.0',
    endpoints: '/api/v1',
    bakeryVerificationPortal: '/bakery'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
