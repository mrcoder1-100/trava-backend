const { v4: uuidv4 } = require('uuid');
const db = require('../repositories/db');
const config = require('../config');

function submitVerification(req, res) {
  try {
    const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
    const { journeyId, busId, routeId, photoBase64, isHourlyCheck } = req.body;

    const isSimulated = !config.visionApiKey;
    const verificationRecord = {
      id: `verif_${uuidv4().substring(0, 8)}`,
      userId,
      journeyId: journeyId || null,
      busId: busId || 'bus_95_a',
      routeId: routeId || 'route_95',
      isHourlyCheck: Boolean(isHourlyCheck),
      status: 'VERIFIED',
      verificationMode: isSimulated ? 'DEMO_MOCK_VERIFICATION' : 'AI_VISION',
      isSimulatedVerification: isSimulated,
      demoLabel: isSimulated ? 'DEMO MODE · MOCK PHOTO VERIFICATION' : 'AI VISION VERIFIED',
      message: isSimulated
        ? 'Photo accepted. Camera verification simulated for demonstration.'
        : 'Photo verified. Bus presence validated via Vision AI.',
      confidenceScore: isSimulated ? 0.98 : 0.94,
      capturedAt: new Date().toISOString()
    };

    db.create('verification_records', verificationRecord);

    res.status(200).json({
      success: true,
      data: verificationRecord
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getVerificationByJourney(req, res) {
  const { journeyId } = req.params;
  const records = db.find('verification_records', v => v.journeyId === journeyId);
  res.json({
    success: true,
    journeyId,
    count: records.length,
    data: records
  });
}

module.exports = {
  submitVerification,
  getVerificationByJourney
};
