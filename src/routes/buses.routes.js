const express = require('express');
const router = express.Router();
const busesController = require('../controllers/buses.controller');

router.get('/:id', busesController.getBusById);
router.get('/:id/live', busesController.getBusLive);
router.get('/route/:id', busesController.getRouteBuses);
router.get('/route/:id/live', busesController.getRouteLive);

module.exports = router;
