const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demo.controller');

router.post('/reset', demoController.resetDemo);
router.post('/tick', demoController.advanceSimulationTick);
router.post('/pass-the-torch', demoController.triggerPassTheTorch);
router.get('/status', demoController.getDemoStatus);

module.exports = router;
