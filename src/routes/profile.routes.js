const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/', optionalAuth, profileController.getProfile);
router.patch('/', optionalAuth, profileController.updateProfile);

module.exports = router;
