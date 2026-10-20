const journeyService = require('../services/journey.service');

function startJourney(req, res) {
  try {
    const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
    const { routeId, busId, boardingStopId, destinationStopId, photoBase64, mockVerification } = req.body;

    const result = journeyService.startJourney({
      userId,
      routeId,
      busId,
      boardingStopId,
      destinationStopId,
      photoBase64,
      mockVerification
    });

    res.status(201).json({
      success: true,
      message: 'Journey started successfully',
      ...result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getJourneyById(req, res) {
  const journey = journeyService.getJourneyById(req.params.id);
  if (!journey) {
    return res.status(404).json({ success: false, error: 'Journey not found' });
  }
  res.json({ success: true, data: journey });
}

function stopJourney(req, res) {
  try {
    const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
    const journeyId = req.params.id;

    const result = journeyService.stopJourney(userId, journeyId);
    res.json({
      success: true,
      message: 'Journey completed and processed',
      ...result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getJourneyHistory(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const journeys = journeyService.getUserJourneys(userId);
  res.json({
    success: true,
    count: journeys.length,
    data: journeys
  });
}

module.exports = {
  startJourney,
  getJourneyById,
  stopJourney,
  getJourneyHistory
};
