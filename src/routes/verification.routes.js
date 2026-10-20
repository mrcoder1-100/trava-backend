const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.post('/submit', optionalAuth, verificationController.submitVerification);
router.get('/:journeyId', optionalAuth, verificationController.getVerificationByJourney);

module.exports = router;
