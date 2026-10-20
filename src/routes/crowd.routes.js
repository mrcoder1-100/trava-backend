const express = require('express');
const router = express.Router();
const crowdController = require('../controllers/crowd.controller');

router.post('/', crowdController.submitCrowdReport);
router.get('/routes/:id', crowdController.getRouteCrowd);

module.exports = router;
