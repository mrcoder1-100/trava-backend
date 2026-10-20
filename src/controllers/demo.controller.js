const busService = require('../services/bus.service');
const db = require('../repositories/db');

function resetDemo(req, res) {
  try {
    busService.resetSimulation();
    res.json({
      success: true,
      message: 'Trava Coimbatore demonstration state reset successfully to pristine demo baseline.',
      demoUser: {
        email: 'demo@trava.org',
        password: 'Password123!',
        points: 50
      },
      availableRoutes: '5 Coimbatore routes active (95, 111, 20C, 70, 10A)',
      simulatedBuses: 12,
      testCoupons: {
        valid: 'TRAVA-BAKE-95A1',
        alreadyUsed: 'TRAVA-BAKE-USED',
        expired: 'TRAVA-BAKE-EXPR'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function advanceSimulationTick(req, res) {
  const seconds = parseInt(req.body.seconds, 10) || 5;
  busService.tick(seconds);
  const buses = busService.getRouteBuses('route_95');
  res.json({
    success: true,
    message: `Advanced simulation by ${seconds} seconds`,
    buses
  });
}

function triggerPassTheTorch(req, res) {
  const busId = req.body.busId || 'bus_95_a';
  const updatedBus = busService.passTheTorch(busId, {
    id: 'usr_torch_subagent_02',
    name: 'Verified Passenger #2'
  });

  if (!updatedBus) {
    return res.status(404).json({ success: false, error: 'Bus not found' });
  }

  res.json({
    success: true,
    message: 'Pass the Torch triggered: Seamless contributor handoff simulated without interrupting tracking.',
    bus: updatedBus
  });
}

function getDemoStatus(req, res) {
  const buses = busService.getRouteBuses('route_95');
  const user = db.findById('users', 'usr_demo_coimbatore_01');
  const coupons = db.find('coupons', c => c.userId === 'usr_demo_coimbatore_01');

  res.json({
    success: true,
    branding: {
      appName: 'Trava',
      tagline: "People Solving People's Problem.",
      subtitle: 'Know Where Your Bus Is, on Every Route.',
      city: 'Coimbatore, Tamil Nadu, India'
    },
    demoUser: {
      id: user ? user.id : null,
      email: user ? user.email : null,
      points: user ? user.pointsBalance : 0
    },
    busesCount: buses.length,
    couponsCount: coupons.length,
    simulationActive: true
  });
}

module.exports = {
  resetDemo,
  advanceSimulationTick,
  triggerPassTheTorch,
  getDemoStatus
};
