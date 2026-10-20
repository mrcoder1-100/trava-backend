const express = require('express');
const router = express.Router();
const gpsController = require('../controllers/gps.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/batch', optionalAuth, gpsController.recordGpsBatch);
router.get('/journeys/:id/locations', optionalAuth, gpsController.getJourneyLocations);

module.exports = router;
