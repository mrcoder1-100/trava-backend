const express = require('express');
const router = express.Router();
const journeysController = require('../controllers/journeys.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/start', optionalAuth, journeysController.startJourney);
router.get('/history', optionalAuth, journeysController.getJourneyHistory);
router.get('/:id', optionalAuth, journeysController.getJourneyById);
router.post('/:id/stop', optionalAuth, journeysController.stopJourney);

module.exports = router;
