const db = require('../repositories/db');

function getAllRoutes(req, res) {
  const routes = db.find('routes', r => r.status === 'ACTIVE');
  res.json({
    success: true,
    count: routes.length,
    data: routes
  });
}

function getRouteById(req, res) {
  const route = db.findById('routes', req.params.id);
  if (!route) {
    return res.status(404).json({ success: false, error: 'Route not found' });
  }
  res.json({
    success: true,
    data: route
  });
}

function getRouteStops(req, res) {
  const route = db.findById('routes', req.params.id);
  if (!route) {
    return res.status(404).json({ success: false, error: 'Route not found' });
  }
  res.json({
    success: true,
    data: route.stops || []
  });
}

module.exports = {
  getAllRoutes,
  getRouteById,
  getRouteStops
};
