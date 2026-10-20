const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const routesRoutes = require('./routes.routes');
const busesRoutes = require('./buses.routes');
const journeysRoutes = require('./journeys.routes');
const gpsRoutes = require('./gps.routes');
const verificationRoutes = require('./verification.routes');
const crowdRoutes = require('./crowd.routes');
const rewardsRoutes = require('./rewards.routes');
const couponsRoutes = require('./coupons.routes');
const profileRoutes = require('./profile.routes');
const demoRoutes = require('./demo.routes');
const ttsRoutes = require('./tts.routes');
const ivrRoutes = require('./ivr.routes');

const busesController = require('../controllers/buses.controller');
const crowdController = require('../controllers/crowd.controller');
const routesController = require('../controllers/routes.controller');

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/routes', routesRoutes);
router.use('/buses', busesRoutes);
router.use('/journeys', journeysRoutes);
router.use('/gps', gpsRoutes);
router.use('/verification', verificationRoutes);
router.use('/crowd-reports', crowdRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/coupons', couponsRoutes);
router.use('/profile', profileRoutes);
router.use('/demo', demoRoutes);
router.use('/tts', ttsRoutes);
router.use('/ivr', ivrRoutes);

// Direct alias routes as specifically required in Section 23
router.get('/routes/:id/buses', busesController.getRouteBuses);
router.get('/routes/:id/live', busesController.getRouteLive);
router.get('/routes/:id/crowd', crowdController.getRouteCrowd);

module.exports = router;
