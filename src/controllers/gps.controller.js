const journeyService = require('../services/journey.service');
const db = require('../repositories/db');

function recordGpsBatch(req, res) {
  try {
    const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
    const { journeyId, records } = req.body;

    if (!journeyId || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'journeyId and records array are required'
      });
    }

    const result = journeyService.recordGpsBatch(userId, journeyId, records);
    res.json({
      success: true,
      message: 'GPS records batch processed',
      ...result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getJourneyLocations(req, res) {
  const { id } = req.params;
  const records = db.find('gps_records', r => r.journeyId === id);
  res.json({
    success: true,
    journeyId: id,
    count: records.length,
    data: records
  });
}

module.exports = {
  recordGpsBatch,
  getJourneyLocations
};
