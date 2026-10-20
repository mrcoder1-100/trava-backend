const path = require('path');
require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'trava_jwt_secret_coimbatore_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dataDir: path.resolve(__dirname, '../../data'),
  
  // Simulation & Journey Rules
  simulationTickSeconds: parseInt(process.env.SIMULATION_TICK_SECONDS, 10) || 2,
  minJourneyDistanceKm: parseFloat(process.env.MIN_JOURNEY_DISTANCE_KM) || 0.5,
  pointsPerEligibleJourney: parseInt(process.env.POINTS_PER_ELIGIBLE_JOURNEY, 10) || 50,
  scratchCardThresholdPoints: parseInt(process.env.SCRATCH_CARD_THRESHOLD_POINTS, 10) || 100,
  dailyPointsCap: parseInt(process.env.DAILY_POINTS_CAP, 10) || 200,

  // External APIs (Optional)
  visionApiKey: process.env.VISION_API_KEY || null,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || null,

  branding: {
    appName: 'Trava',
    tagline: "People Solving People's Problem.",
    subtitle: 'Know Where Your Bus Is, on Every Route.',
    city: 'Coimbatore, Tamil Nadu, India'
  }
};
