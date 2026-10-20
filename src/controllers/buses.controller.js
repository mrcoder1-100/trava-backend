const busService = require('../services/bus.service');
const db = require('../repositories/db');

function getRouteBuses(req, res) {
  const { id } = req.params;
  const buses = busService.getRouteBuses(id).map(bus => {
    const rawEta = bus.etaMinutes || 0;
    const eta = rawEta < 12 ? Math.max(14, rawEta + 11) : rawEta;
    return {
      ...bus,
      etaMinutes: eta,
      distanceRemainingKm: Math.max(2.8, bus.distanceRemainingKm || 3.5),
      latitude: bus.currentLatitude,
      longitude: bus.currentLongitude,
      progress: bus.currentProgress
    };
  });
  res.json({
    success: true,
    routeId: id,
    count: buses.length,
    isSimulatedData: true,
    demoLabel: 'DEMO MODE · SIMULATED GPS',
    data: buses
  });
}

function getBusById(req, res) {
  const { id } = req.params;
  const bus = busService.getBusById(id);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found' });
  }
  const rawEta = bus.etaMinutes || 0;
  const eta = rawEta < 12 ? Math.max(14, rawEta + 11) : rawEta;
  const enriched = {
    ...bus,
    etaMinutes: eta,
    distanceRemainingKm: Math.max(2.8, bus.distanceRemainingKm || 3.5),
    latitude: bus.currentLatitude,
    longitude: bus.currentLongitude,
    progress: bus.currentProgress
  };
  res.json({
    success: true,
    isSimulatedData: bus.isSimulated,
    demoLabel: 'DEMO MODE · SIMULATED GPS',
    data: enriched
  });
}

function getBusLive(req, res) {
  const { id } = req.params;
  const bus = busService.getBusById(id);
  if (!bus) {
    return res.status(404).json({ success: false, error: 'Bus not found' });
  }
  const rawEta = bus.etaMinutes || 0;
  const eta = rawEta < 12 ? Math.max(14, rawEta + 11) : rawEta;
  const distance = Math.max(2.8, bus.distanceRemainingKm || 3.5);

  res.json({
    success: true,
    id: bus.id,
    busId: bus.id,
    busNumber: bus.busNumber,
    vehicleReg: bus.vehicleReg,
    operatorName: bus.operatorName || 'TNSTC - Coimbatore Division',
    operatorType: bus.operatorType || 'GOVERNMENT',
    serviceType: bus.serviceType || 'City Service',
    routeId: bus.routeId,
    latitude: bus.currentLatitude,
    longitude: bus.currentLongitude,
    currentLatitude: bus.currentLatitude,
    currentLongitude: bus.currentLongitude,
    bearing: bus.bearing,
    speedKmH: bus.speedKmH,
    progress: bus.currentProgress,
    currentProgress: bus.currentProgress,
    currentStopId: bus.currentStopId,
    nextStopId: bus.nextStopId,
    etaMinutes: eta,
    distanceRemainingKm: distance,
    crowdStatus: bus.crowdStatus,
    locationFreshness: bus.locationFreshness,
    trackingStatus: bus.trackingStatus,
    demoLabel: 'DEMO MODE · SIMULATED GPS',
    lastUpdated: bus.lastUpdated
  });
}

function getRouteLive(req, res) {
  const { id } = req.params;
  const buses = busService.getRouteBuses(id).map(bus => {
    const rawEta = bus.etaMinutes || 0;
    const eta = rawEta < 12 ? Math.max(14, rawEta + 11) : rawEta;
    return {
      ...bus,
      etaMinutes: eta,
      distanceRemainingKm: Math.max(2.8, bus.distanceRemainingKm || 3.5),
      latitude: bus.currentLatitude,
      longitude: bus.currentLongitude,
      progress: bus.currentProgress
    };
  });
  const route = db.findById('routes', id);
  res.json({
    success: true,
    routeId: id,
    routeName: route ? route.name : id,
    demoLabel: 'DEMO MODE · SIMULATED GPS',
    buses
  });
}

module.exports = {
  getRouteBuses,
  getBusById,
  getBusLive,
  getRouteLive
};
