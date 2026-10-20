const { v4: uuidv4 } = require('uuid');
const db = require('../repositories/db');

function submitCrowdReport(req, res) {
  try {
    const { routeId, busId, crowdCategory } = req.body;
    const validCategories = ['EMPTY', 'SEATS_AVAILABLE', 'PACKED'];

    if (!validCategories.includes(crowdCategory)) {
      return res.status(400).json({
        success: false,
        error: `Invalid crowdCategory. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const report = db.create('crowd_reports', {
      id: `cr_${uuidv4().substring(0, 8)}`,
      routeId: routeId || 'route_95',
      busId: busId || 'bus_95_a',
      crowdCategory,
      timestamp: new Date().toISOString()
    });

    // Update bus crowd status
    if (busId) {
      db.update('bus_services', busId, { crowdStatus: crowdCategory });
    }

    res.status(201).json({
      success: true,
      message: 'Crowd status reported successfully',
      data: report
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getRouteCrowd(req, res) {
  const { id } = req.params;
  const reports = db.find('crowd_reports', r => r.routeId === id);
  res.json({
    success: true,
    routeId: id,
    count: reports.length,
    data: reports.slice(-10)
  });
}

module.exports = {
  submitCrowdReport,
  getRouteCrowd
};
