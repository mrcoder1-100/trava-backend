const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewards.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/balance', optionalAuth, rewardsController.getBalance);
router.get('/ledger', optionalAuth, rewardsController.getLedger);
router.get('/scratch-cards', optionalAuth, rewardsController.getScratchCards);
router.post('/scratch-cards/:id/reveal', optionalAuth, rewardsController.revealScratchCard);

module.exports = router;
