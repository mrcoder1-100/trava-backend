const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routes.controller');

router.get('/', routesController.getAllRoutes);
router.get('/:id', routesController.getRouteById);
router.get('/:id/stops', routesController.getRouteStops);

module.exports = router;
