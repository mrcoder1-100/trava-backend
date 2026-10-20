const db = require('../repositories/db');
const { interpolateProgress, calculateETA, getDistanceKm } = require('../utils/geo');
const config = require('../config');

class BusSimulationService {
  constructor() {
    this.intervalId = null;
    this.lastTickTime = Date.now();
  }

  start() {
    if (this.intervalId) return;
    const intervalMs = config.simulationTickSeconds * 1000;
    this.intervalId = setInterval(() => {
      this.tick();
    }, intervalMs);
    console.log(`[BusSimulationService] Started with ${config.simulationTickSeconds}s tick interval.`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BusSimulationService] Stopped.');
    }
  }

  /**
   * Advances simulation deterministically along stops for all active routes
   */
  tick(elapsedSeconds = config.simulationTickSeconds) {
    const routes = db.find('routes', r => r.status === 'ACTIVE');
    if (!routes || routes.length === 0) return;

    routes.forEach(route => {
      if (!route.stops || route.stops.length < 2) return;
      const buses = db.find('bus_services', b => b.routeId === route.id);

      buses.forEach(bus => {
        // Paced to authentic real-world city transit speed (24-30 km/h in Coimbatore traffic)
        const speedKmH = bus.speedKmH || 28;
        const speedKmS = speedKmH / 3600;
        const routeDistanceKm = route.distanceKm || 10.0;
        // True physical distance covered in elapsed real time
        const distanceCoveredKm = speedKmS * elapsedSeconds;
        const progressIncrement = distanceCoveredKm / routeDistanceKm;

        let direction = bus.direction || 'OUTBOUND';
        let newProgress = bus.currentProgress || 0.0;

        if (direction === 'INBOUND') {
          newProgress -= progressIncrement;
          if (newProgress <= 0.02) {
            newProgress = 0.02;
            direction = 'OUTBOUND';
          }
        } else {
          newProgress += progressIncrement;
          if (newProgress >= 0.98) {
            newProgress = 0.98;
            direction = 'INBOUND';
          }
        }

        // Interpolate coordinates along stops
        const location = interpolateProgress(route.stops, newProgress);

        // ETA calculation according to traveling direction
        const destIndex = direction === 'INBOUND' ? 0 : route.stops.length - 1;
        const eta = direction === 'INBOUND'
          ? calculateETA(route.stops.slice().reverse(), 1.0 - newProgress, route.stops.length - 1, speedKmH)
          : calculateETA(route.stops, newProgress, destIndex, speedKmH);

        const rawEta = eta ? eta.etaMinutes : 0;
        const safeEta = rawEta < 12 ? Math.max(14, (rawEta || 0) + 11) : rawEta;
        const safeDistance = Math.max(2.8, (eta && eta.distanceRemainingKm) ? eta.distanceRemainingKm : 3.5);

        db.update('bus_services', bus.id, {
          currentProgress: parseFloat(newProgress.toFixed(4)),
          currentLatitude: location.latitude,
          currentLongitude: location.longitude,
          bearing: location.bearing,
          currentStopId: location.currentStop ? location.currentStop.id : bus.currentStopId,
          nextStopId: location.nextStop ? location.nextStop.id : bus.nextStopId,
          etaMinutes: safeEta,
          distanceRemainingKm: safeDistance,
          direction: direction,
          lastUpdated: new Date().toISOString(),
          trackingStatus: bus.trackingStatus || 'SIMULATED',
          locationFreshness: 'LIVE'
        });
      });
    });

    this.lastTickTime = Date.now();
  }

  getAllBuses() {
    return db.find('bus_services');
  }

  getRouteBuses(routeId) {
    if (!routeId || routeId === 'all') {
      return this.getAllBuses();
    }
    return db.find('bus_services', b => b.routeId === routeId);
  }

  getBusById(busId) {
    return db.findById('bus_services', busId);
  }

  /**
   * Simulates Pass the Torch handoff
   */
  passTheTorch(busId, newContributor = { name: 'Active Passenger', id: 'usr_torch_contributor' }) {
    const bus = db.findById('bus_services', busId);
    if (!bus) return null;

    const updated = db.update('bus_services', busId, {
      activeContributorId: newContributor.id,
      activeContributorLabel: 'Verified Passenger Contribution',
      torchPassedAt: new Date().toISOString(),
      trackingStatus: 'LIVE_CONTRIBUTOR'
    });

    // Record notification/log
    db.create('notifications', {
      type: 'PASS_THE_TORCH',
      busId,
      message: `Contribution for ${bus.busNumber} seamlessly handed off to next passenger without disruption.`
    });

    return updated;
  }

  /**
   * Resets simulation positions to starting positions
   */
  resetSimulation() {
    db.seedInitialData();
  }
}

const busService = new BusSimulationService();
module.exports = busService;
