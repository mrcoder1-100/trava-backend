const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Collection filenames
const COLLECTIONS = [
  'users',
  'sessions',
  'routes',
  'bus_services',
  'journeys',
  'gps_records',
  'verification_records',
  'rewards',
  'coupons',
  'redemptions',
  'crowd_reports',
  'notifications'
];

class JsonDatabase {
  constructor(dataDir = config.dataDir) {
    this.dataDir = dataDir;
    this.cache = new Map();
    this.locks = new Map();
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Ensure all collections exist
    for (const name of COLLECTIONS) {
      const filePath = path.join(this.dataDir, `${name}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      }
      this.loadCollection(name);
    }

    // If database is empty or routes are missing, seed initial Coimbatore demo data
    if (this.getCollection('routes').length < 5) {
      this.seedInitialData();
    }
  }

  loadCollection(name) {
    const filePath = path.join(this.dataDir, `${name}.json`);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw || '[]');
      this.cache.set(name, Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Error loading collection ${name}:`, err.message);
      this.cache.set(name, []);
    }
  }

  getCollection(name) {
    if (!this.cache.has(name)) {
      this.loadCollection(name);
    }
    return this.cache.get(name) || [];
  }

  /**
   * Atomic, safe write to JSON file
   */
  persistCollection(name) {
    const filePath = path.join(this.dataDir, `${name}.json`);
    const tempPath = path.join(this.dataDir, `${name}.tmp.${Date.now()}`);
    const data = this.cache.get(name) || [];

    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      // Fallback direct write if atomic rename fails on Windows lock
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (innerErr) {
        console.error(`Fatal error persisting collection ${name}:`, innerErr.message);
      }
    }
  }

  find(collectionName, predicate = () => true) {
    const items = this.getCollection(collectionName);
    return items.filter(predicate);
  }

  findOne(collectionName, predicate) {
    const items = this.getCollection(collectionName);
    return items.find(predicate) || null;
  }

  findById(collectionName, id) {
    return this.findOne(collectionName, item => item.id === id);
  }

  create(collectionName, record) {
    const items = this.getCollection(collectionName);
    const created = {
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(created);
    this.persistCollection(collectionName);
    return created;
  }

  update(collectionName, id, updates) {
    const items = this.getCollection(collectionName);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persistCollection(collectionName);
    return items[index];
  }

  delete(collectionName, id) {
    const items = this.getCollection(collectionName);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;

    items.splice(index, 1);
    this.persistCollection(collectionName);
    return true;
  }

  /**
   * Resets all demo data to pristine demo presentation state
   */
  seedInitialData() {
    console.log('Seeding initial Coimbatore demonstration data...');

    // 1. Users
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('Password123!', salt);
    const demoUser = {
      id: 'usr_demo_coimbatore_01',
      fullName: 'Sam',
      email: 'demo@trava.org',
      passwordHash: hashedPassword,
      role: 'PASSENGER',
      pointsBalance: 50, // Starts with 50 points; 1 journey (+50 pts) unlocks scratch card (threshold 100)
      isDemoAccount: true,
      createdAt: new Date().toISOString()
    };
    this.cache.set('users', [demoUser]);
    this.persistCollection('users');

    // 2. Coimbatore Routes (Route 95, 111, 20C, 70, 10A)
    const route95Stops = [
      {
        id: 'stop_gandhipuram',
        name: 'Gandhipuram Central Bus Stand',
        shortName: 'Gandhipuram',
        sequence: 1,
        latitude: 11.016844,
        longitude: 76.967812,
        isMajorJunction: true
      },
      {
        id: 'stop_lakshmi_mills',
        name: 'Lakshmi Mills Junction',
        shortName: 'Lakshmi Mills',
        sequence: 2,
        latitude: 11.011832,
        longitude: 76.982544,
        isMajorJunction: false
      },
      {
        id: 'stop_nava_india',
        name: 'Nava India Signal',
        shortName: 'Nava India',
        sequence: 3,
        latitude: 11.019521,
        longitude: 76.999815,
        isMajorJunction: false
      },
      {
        id: 'stop_peelamedu',
        name: 'Peelamedu Bus Stop',
        shortName: 'Peelamedu',
        sequence: 4,
        latitude: 11.026033,
        longitude: 77.016045,
        isMajorJunction: true
      },
      {
        id: 'stop_fun_mall',
        name: 'Fun Republic Mall Area',
        shortName: 'Fun Mall Area',
        sequence: 5,
        latitude: 11.021021,
        longitude: 77.028014,
        isMajorJunction: false
      },
      {
        id: 'stop_singanallur',
        name: 'Singanallur Bus Terminus',
        shortName: 'Singanallur',
        sequence: 6,
        latitude: 10.998055,
        longitude: 77.032011,
        isMajorJunction: true
      }
    ];

    const route111Stops = [
      {
        id: 'stop_111_gandhipuram',
        name: 'Gandhipuram Central Bus Stand',
        shortName: 'Gandhipuram',
        sequence: 1,
        latitude: 11.016844,
        longitude: 76.967812,
        isMajorJunction: true
      },
      {
        id: 'stop_111_railway',
        name: 'Coimbatore Junction Railway Station',
        shortName: 'Railway Station',
        sequence: 2,
        latitude: 10.998300,
        longitude: 76.966500,
        isMajorJunction: true
      },
      {
        id: 'stop_111_collectorate',
        name: 'Collectorate / District Court',
        shortName: 'Collectorate',
        sequence: 3,
        latitude: 10.999500,
        longitude: 76.961000,
        isMajorJunction: false
      },
      {
        id: 'stop_111_townhall',
        name: 'Town Hall / Mani Koodu',
        shortName: 'Town Hall',
        sequence: 4,
        latitude: 10.993000,
        longitude: 76.960500,
        isMajorJunction: true
      },
      {
        id: 'stop_111_ukkadam',
        name: 'Ukkadam Bus Terminus',
        shortName: 'Ukkadam',
        sequence: 5,
        latitude: 10.985800,
        longitude: 76.958000,
        isMajorJunction: true
      }
    ];

    const route20cStops = [
      {
        id: 'stop_20c_gandhipuram',
        name: 'Gandhipuram Central Bus Stand',
        shortName: 'Gandhipuram',
        sequence: 1,
        latitude: 11.016844,
        longitude: 76.967812,
        isMajorJunction: true
      },
      {
        id: 'stop_20c_ganapathy',
        name: 'Ganapathy Bus Stop',
        shortName: 'Ganapathy',
        sequence: 2,
        latitude: 11.036000,
        longitude: 76.978000,
        isMajorJunction: true
      },
      {
        id: 'stop_20c_prozone',
        name: 'Prozone Mall / Sivanandapuram',
        shortName: 'Prozone Mall',
        sequence: 3,
        latitude: 11.055000,
        longitude: 76.992000,
        isMajorJunction: false
      },
      {
        id: 'stop_20c_chil_sez',
        name: 'CHIL SEZ / KCT Tech Park',
        shortName: 'CHIL SEZ',
        sequence: 4,
        latitude: 11.077000,
        longitude: 76.998000,
        isMajorJunction: true
      },
      {
        id: 'stop_20c_saravanampatti',
        name: 'Saravanampatti Junction',
        shortName: 'Saravanampatti',
        sequence: 5,
        latitude: 11.082500,
        longitude: 76.999500,
        isMajorJunction: true
      }
    ];

    const route70Stops = [
      {
        id: 'stop_70_singanallur',
        name: 'Singanallur Bus Terminus',
        shortName: 'Singanallur',
        sequence: 1,
        latitude: 10.998055,
        longitude: 77.032011,
        isMajorJunction: true
      },
      {
        id: 'stop_70_ramanathapuram',
        name: 'Ramanathapuram Signal',
        shortName: 'Ramanathapuram',
        sequence: 2,
        latitude: 10.993500,
        longitude: 76.992000,
        isMajorJunction: true
      },
      {
        id: 'stop_70_sungam',
        name: 'Sungam Junction',
        shortName: 'Sungam',
        sequence: 3,
        latitude: 10.991000,
        longitude: 76.974000,
        isMajorJunction: false
      },
      {
        id: 'stop_70_valankulam',
        name: 'Valankulam Lake Promenade',
        shortName: 'Valankulam Lake',
        sequence: 4,
        latitude: 10.988000,
        longitude: 76.966000,
        isMajorJunction: false
      },
      {
        id: 'stop_70_ukkadam',
        name: 'Ukkadam Bus Terminus',
        shortName: 'Ukkadam',
        sequence: 5,
        latitude: 10.985800,
        longitude: 76.958000,
        isMajorJunction: true
      }
    ];

    const route10aStops = [
      {
        id: 'stop_10a_gandhipuram',
        name: 'Gandhipuram Central Bus Stand',
        shortName: 'Gandhipuram',
        sequence: 1,
        latitude: 11.016844,
        longitude: 76.967812,
        isMajorJunction: true
      },
      {
        id: 'stop_10a_db_road',
        name: 'DB Road RS Puram',
        shortName: 'RS Puram',
        sequence: 2,
        latitude: 11.008000,
        longitude: 76.951000,
        isMajorJunction: true
      },
      {
        id: 'stop_10a_lawley_road',
        name: 'Lawley Road Junction',
        shortName: 'Lawley Road',
        sequence: 3,
        latitude: 11.012500,
        longitude: 76.938000,
        isMajorJunction: false
      },
      {
        id: 'stop_10a_tnau',
        name: 'TNAU Agricultural University',
        shortName: 'TNAU',
        sequence: 4,
        latitude: 11.014000,
        longitude: 76.931000,
        isMajorJunction: true
      },
      {
        id: 'stop_10a_vadavalli',
        name: 'Vadavalli Bus Stand',
        shortName: 'Vadavalli',
        sequence: 5,
        latitude: 11.028000,
        longitude: 76.902000,
        isMajorJunction: true
      }
    ];

    const routes = [
      {
        id: 'route_95',
        routeNumber: '95',
        name: 'Gandhipuram ↔ Singanallur (via Peelamedu)',
        city: 'Coimbatore',
        origin: 'Gandhipuram',
        destination: 'Singanallur',
        distanceKm: 11.8,
        estimatedDurationMinutes: 38,
        status: 'ACTIVE',
        stops: route95Stops,
        direction: 'OUTBOUND',
        isDemoRoute: true
      },
      {
        id: 'route_111',
        routeNumber: '111',
        name: 'Gandhipuram ↔ Ukkadam (via Railway Station)',
        city: 'Coimbatore',
        origin: 'Gandhipuram',
        destination: 'Ukkadam',
        distanceKm: 6.8,
        estimatedDurationMinutes: 24,
        status: 'ACTIVE',
        stops: route111Stops,
        direction: 'OUTBOUND',
        isDemoRoute: true
      },
      {
        id: 'route_20c',
        routeNumber: '20C',
        name: 'Gandhipuram ↔ Saravanampatti (IT Corridor)',
        city: 'Coimbatore',
        origin: 'Gandhipuram',
        destination: 'Saravanampatti',
        distanceKm: 12.4,
        estimatedDurationMinutes: 36,
        status: 'ACTIVE',
        stops: route20cStops,
        direction: 'OUTBOUND',
        isDemoRoute: true
      },
      {
        id: 'route_70',
        routeNumber: '70',
        name: 'Singanallur ↔ Ukkadam (via Sungam)',
        city: 'Coimbatore',
        origin: 'Singanallur',
        destination: 'Ukkadam',
        distanceKm: 9.8,
        estimatedDurationMinutes: 30,
        status: 'ACTIVE',
        stops: route70Stops,
        direction: 'OUTBOUND',
        isDemoRoute: true
      },
      {
        id: 'route_10a',
        routeNumber: '10A',
        name: 'Gandhipuram ↔ Vadavalli (via RS Puram)',
        city: 'Coimbatore',
        origin: 'Gandhipuram',
        destination: 'Vadavalli',
        distanceKm: 9.5,
        estimatedDurationMinutes: 30,
        status: 'ACTIVE',
        stops: route10aStops,
        direction: 'OUTBOUND',
        isDemoRoute: true
      }
    ];

    this.cache.set('routes', routes);
    this.persistCollection('routes');

    // 3. Simulated Bus Instances with Real Government & Mock Private Operators
    const busServices = [
      // --- Route 95 Buses ---
      {
        id: 'bus_95_a',
        busNumber: 'TNSTC — Green Express',
        vehicleReg: 'TN 38 N 2481',
        operatorName: 'TNSTC - Coimbatore Division',
        operatorType: 'GOVERNMENT',
        serviceType: 'City Ordinary',
        routeId: 'route_95',
        direction: 'OUTBOUND',
        driverName: 'Murugan S.',
        capacity: 48,
        crowdStatus: 'SEATS_AVAILABLE',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.12,
        speedKmH: 32,
        currentStopId: 'stop_gandhipuram',
        nextStopId: 'stop_lakshmi_mills',
        currentLatitude: 11.0160,
        currentLongitude: 76.9700,
        bearing: 110,
        etaMinutes: 28,
        activeJourneyId: 'jrn_sim_bus_a',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_95_b',
        busNumber: 'Kovai Transports — City Star',
        vehicleReg: 'TN 38 AB 1122',
        operatorName: 'Kovai Transports',
        operatorType: 'PRIVATE',
        serviceType: 'City Express',
        routeId: 'route_95',
        direction: 'OUTBOUND',
        driverName: 'Karthik V.',
        capacity: 48,
        crowdStatus: 'SEATS_AVAILABLE',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.38,
        speedKmH: 28,
        currentStopId: 'stop_lakshmi_mills',
        nextStopId: 'stop_nava_india',
        currentLatitude: 11.0185,
        currentLongitude: 76.9950,
        bearing: 75,
        etaMinutes: 20,
        activeJourneyId: 'jrn_sim_bus_b',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_95_c',
        busNumber: 'TNSTC — Deluxe Rider',
        vehicleReg: 'TN 38 N 3340',
        operatorName: 'TNSTC - Coimbatore Division',
        operatorType: 'GOVERNMENT',
        serviceType: 'Deluxe Point-to-Point',
        routeId: 'route_95',
        direction: 'OUTBOUND',
        driverName: 'Senthil Kumar',
        capacity: 48,
        crowdStatus: 'PACKED',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.65,
        speedKmH: 34,
        currentStopId: 'stop_peelamedu',
        nextStopId: 'stop_fun_mall',
        currentLatitude: 11.0240,
        currentLongitude: 77.0210,
        bearing: 95,
        etaMinutes: 18,
        activeJourneyId: 'jrn_sim_bus_c',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_95_d',
        busNumber: 'G.V. Travels — Royal Flyer',
        vehicleReg: 'TN 38 CA 8899',
        operatorName: 'G.V. Travels',
        operatorType: 'PRIVATE',
        serviceType: 'Executive Rapid',
        routeId: 'route_95',
        direction: 'OUTBOUND',
        driverName: 'Anand R.',
        capacity: 48,
        crowdStatus: 'EMPTY',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.88,
        speedKmH: 30,
        currentStopId: 'stop_fun_mall',
        nextStopId: 'stop_singanallur',
        currentLatitude: 11.0060,
        currentLongitude: 77.0305,
        bearing: 160,
        etaMinutes: 14,
        activeJourneyId: 'jrn_sim_bus_d',
        lastUpdated: new Date().toISOString()
      },

      // --- Route 111 Buses (Gandhipuram ↔ Ukkadam) ---
      {
        id: 'bus_111_a',
        busNumber: 'TNSTC — Town Shuttle',
        vehicleReg: 'TN 38 N 2901',
        operatorName: 'TNSTC - Coimbatore Division',
        operatorType: 'GOVERNMENT',
        serviceType: 'Ordinary City Service',
        routeId: 'route_111',
        direction: 'OUTBOUND',
        driverName: 'P. Natarajan',
        capacity: 48,
        crowdStatus: 'SEATS_AVAILABLE',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.28,
        speedKmH: 26,
        currentStopId: 'stop_111_railway',
        nextStopId: 'stop_111_collectorate',
        currentLatitude: 10.9983,
        currentLongitude: 76.9665,
        bearing: 210,
        etaMinutes: 16,
        activeJourneyId: 'jrn_sim_111_a',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_111_b',
        busNumber: 'Sri Murugan — Express Liner',
        vehicleReg: 'TN 38 CC 4321',
        operatorName: 'Sri Murugan Bus Service',
        operatorType: 'PRIVATE',
        serviceType: 'Express Liner',
        routeId: 'route_111',
        direction: 'OUTBOUND',
        driverName: 'M. Selvaraj',
        capacity: 48,
        crowdStatus: 'PACKED',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.68,
        speedKmH: 30,
        currentStopId: 'stop_111_townhall',
        nextStopId: 'stop_111_ukkadam',
        currentLatitude: 10.9930,
        currentLongitude: 76.9605,
        bearing: 195,
        etaMinutes: 15,
        activeJourneyId: 'jrn_sim_111_b',
        lastUpdated: new Date().toISOString()
      },

      // --- Route 20C Buses (Gandhipuram ↔ Saravanampatti IT Corridor) ---
      {
        id: 'bus_20c_a',
        busNumber: 'Rathinam — IT Express',
        vehicleReg: 'TN 38 B 5678',
        operatorName: 'Rathinam Express',
        operatorType: 'PRIVATE',
        serviceType: 'IT Corridor Rapid',
        routeId: 'route_20c',
        direction: 'OUTBOUND',
        driverName: 'V. Dinesh',
        capacity: 48,
        crowdStatus: 'SEATS_AVAILABLE',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.32,
        speedKmH: 36,
        currentStopId: 'stop_20c_ganapathy',
        nextStopId: 'stop_20c_prozone',
        currentLatitude: 11.0360,
        currentLongitude: 76.9780,
        bearing: 35,
        etaMinutes: 22,
        activeJourneyId: 'jrn_sim_20c_a',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_20c_b',
        busNumber: 'TNSTC — Tech Flyer',
        vehicleReg: 'TN 38 N 3154',
        operatorName: 'TNSTC - Coimbatore Division',
        operatorType: 'GOVERNMENT',
        serviceType: 'Deluxe Air Suspended',
        routeId: 'route_20c',
        direction: 'OUTBOUND',
        driverName: 'K. Balan',
        capacity: 48,
        crowdStatus: 'EMPTY',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.78,
        speedKmH: 38,
        currentStopId: 'stop_20c_chil_sez',
        nextStopId: 'stop_20c_saravanampatti',
        currentLatitude: 11.0770,
        currentLongitude: 76.9980,
        bearing: 20,
        etaMinutes: 16,
        activeJourneyId: 'jrn_sim_20c_b',
        lastUpdated: new Date().toISOString()
      },

      // --- Route 70 Buses (Singanallur ↔ Ukkadam) ---
      {
        id: 'bus_70_a',
        busNumber: 'TNSTC — Ring Road Service',
        vehicleReg: 'TN 38 N 4402',
        operatorName: 'TNSTC - Coimbatore Division',
        operatorType: 'GOVERNMENT',
        serviceType: 'Ordinary City Service',
        routeId: 'route_70',
        direction: 'OUTBOUND',
        driverName: 'S. Karuppusamy',
        capacity: 48,
        crowdStatus: 'PACKED',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.42,
        speedKmH: 29,
        currentStopId: 'stop_70_ramanathapuram',
        nextStopId: 'stop_70_sungam',
        currentLatitude: 10.9935,
        currentLongitude: 76.9920,
        bearing: 250,
        etaMinutes: 17,
        activeJourneyId: 'jrn_sim_70_a',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_70_b',
        busNumber: 'SBR Transports — Fast Track',
        vehicleReg: 'TN 38 BK 9081',
        operatorName: 'SBR Transports',
        operatorType: 'PRIVATE',
        serviceType: 'Urban Fast Track',
        routeId: 'route_70',
        direction: 'OUTBOUND',
        driverName: 'A. Muthu',
        capacity: 48,
        crowdStatus: 'SEATS_AVAILABLE',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.76,
        speedKmH: 31,
        currentStopId: 'stop_70_valankulam',
        nextStopId: 'stop_70_ukkadam',
        currentLatitude: 10.9880,
        currentLongitude: 76.9660,
        bearing: 230,
        etaMinutes: 14,
        activeJourneyId: 'jrn_sim_70_b',
        lastUpdated: new Date().toISOString()
      },

      // --- Route 10A Buses (Gandhipuram ↔ Vadavalli) ---
      {
        id: 'bus_10a_a',
        busNumber: 'TNSTC — Marudhamalai Coach',
        vehicleReg: 'TN 38 N 1822',
        operatorName: 'TNSTC - Coimbatore Division',
        operatorType: 'GOVERNMENT',
        serviceType: 'City Ordinary',
        routeId: 'route_10a',
        direction: 'OUTBOUND',
        driverName: 'R. Govindan',
        capacity: 48,
        crowdStatus: 'SEATS_AVAILABLE',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.30,
        speedKmH: 30,
        currentStopId: 'stop_10a_db_road',
        nextStopId: 'stop_10a_lawley_road',
        currentLatitude: 11.0080,
        currentLongitude: 76.9510,
        bearing: 285,
        etaMinutes: 19,
        activeJourneyId: 'jrn_sim_10a_a',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'bus_10a_b',
        busNumber: 'City Star — Metro Deluxe',
        vehicleReg: 'TN 38 M 7712',
        operatorName: 'City Star Express',
        operatorType: 'PRIVATE',
        serviceType: 'Deluxe City Coach',
        routeId: 'route_10a',
        direction: 'OUTBOUND',
        driverName: 'C. Velusamy',
        capacity: 48,
        crowdStatus: 'EMPTY',
        trackingStatus: 'SIMULATED',
        locationFreshness: 'LIVE',
        isSimulated: true,
        currentProgress: 0.74,
        speedKmH: 33,
        currentStopId: 'stop_10a_tnau',
        nextStopId: 'stop_10a_vadavalli',
        currentLatitude: 11.0140,
        currentLongitude: 76.9310,
        bearing: 295,
        etaMinutes: 15,
        activeJourneyId: 'jrn_sim_10a_b',
        lastUpdated: new Date().toISOString()
      }
    ];

    this.cache.set('bus_services', busServices);
    this.persistCollection('bus_services');

    // 4. Rewards Ledger (initial transaction for demo user)
    const initialLedger = [
      {
        id: 'ledg_init_01',
        userId: 'usr_demo_coimbatore_01',
        type: 'WELCOME_BONUS',
        points: 50,
        balanceAfter: 50,
        description: 'Welcome to Trava Coimbatore Community',
        journeyId: null,
        createdAt: new Date().toISOString()
      }
    ];
    this.cache.set('rewards', initialLedger);
    this.persistCollection('rewards');

    // 5. Coupons & Partner Merchant verification test data (Bakery, Restaurant, Supermarket, Gym)
    const coupons = [
      {
        id: 'coup_demo_01',
        code: 'TRAVA-BAKE-95A1',
        userId: 'usr_demo_coimbatore_01',
        customerName: 'Sam (Route 95 Regular Commuter)',
        customerPhone: '+91 98421 10095',
        category: 'BAKERY',
        title: 'Annapoorna Bakery & Sweets',
        description: 'Buy above ₹500, Get ₹150 Cashback on Fresh Pastries & Sweets',
        offerDetails: 'Buy above ₹500, Get ₹150 Cashback',
        minSpend: 500,
        cashbackAmount: 150,
        discountAmount: 50, // Keep 50 for backward test compatibility
        merchantName: 'Annapoorna Bakery & Sweets',
        location: 'Gandhipuram Central, Coimbatore',
        status: 'ACTIVE', // Unredeemed, ready for demo!
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_bake_priya',
        code: 'TRAVA-BAKE-PRIYA',
        userId: 'usr_priya_cbe_02',
        customerName: 'Priya S. (Seat 14B Commuter)',
        customerPhone: '+91 94432 88123',
        category: 'BAKERY',
        title: 'Annapoorna Bakery & Sweets',
        description: 'Buy above ₹500, Get ₹125 Cashback on Bakes & Confectionery',
        offerDetails: 'Buy above ₹500, Get ₹125 Cashback',
        minSpend: 500,
        cashbackAmount: 125,
        discountAmount: 125,
        merchantName: 'Annapoorna Bakery & Sweets',
        location: 'Gandhipuram Central, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: '2026-11-15T21:00:00Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_bake_karthik',
        code: 'TRAVA-BAKE-KARTHIK',
        userId: 'usr_karthik_cbe_03',
        customerName: 'Karthik V. (Express Route 111 Passenger)',
        customerPhone: '+91 97890 45671',
        category: 'BAKERY',
        title: 'Annapoorna Bakery & Sweets',
        description: 'Buy above ₹500, Get ₹150 Cashback on Fresh Breads & Sweets',
        offerDetails: 'Buy above ₹500, Get ₹150 Cashback',
        minSpend: 500,
        cashbackAmount: 150,
        discountAmount: 150,
        merchantName: 'Annapoorna Bakery & Sweets',
        location: 'Gandhipuram Central, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date(Date.now() - 172800000).toISOString(),
        expiresAt: '2026-10-28T22:00:00Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_bake_ananya',
        code: 'TRAVA-BAKE-ANANYA',
        userId: 'usr_ananya_cbe_04',
        customerName: 'Ananya R. (Tidel Park Commuter)',
        customerPhone: '+91 99401 22345',
        category: 'BAKERY',
        title: 'Annapoorna Bakery & Sweets',
        description: 'Buy above ₹500, Get ₹125 Cashback on Celebration Cakes',
        offerDetails: 'Buy above ₹500, Get ₹125 Cashback',
        minSpend: 500,
        cashbackAmount: 125,
        discountAmount: 125,
        merchantName: 'Annapoorna Bakery & Sweets',
        location: 'Gandhipuram Central, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: '2026-12-20T20:30:00Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_bake_rajesh',
        code: 'TRAVA-BAKE-RAJESH',
        userId: 'usr_rajesh_cbe_05',
        customerName: 'Rajesh M. (Gandhipuram Evening Passenger)',
        customerPhone: '+91 98940 33456',
        category: 'BAKERY',
        title: 'Annapoorna Bakery & Sweets',
        description: 'Buy above ₹500, Get ₹150 Cashback on Fresh Bakes & Savouries',
        offerDetails: 'Buy above ₹500, Get ₹150 Cashback',
        minSpend: 500,
        cashbackAmount: 150,
        discountAmount: 150,
        merchantName: 'Annapoorna Bakery & Sweets',
        location: 'Gandhipuram Central, Coimbatore',
        status: 'REDEEMED',
        assignedAt: new Date(Date.now() - 864000000).toISOString(),
        expiresAt: '2026-10-10T21:30:00Z',
        redeemedAt: '2026-10-10T19:42:15Z',
        redeemedByMerchant: 'Annapoorna Bakery Counter #1',
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_rest_01',
        code: 'TRAVA-REST-75ROAST',
        userId: 'usr_demo_coimbatore_01',
        category: 'RESTAURANT',
        title: 'Sree Annapoorna Restaurant',
        description: '₹75 Off on Special Ghee Roast Dosa & Traditional South Indian Thali',
        discountAmount: 75,
        merchantName: 'Sree Annapoorna Restaurant',
        location: 'RS Puram & Gandhipuram, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_rest_02',
        code: 'TRAVA-REST-100BIRYANI',
        userId: 'usr_demo_coimbatore_01',
        category: 'RESTAURANT',
        title: 'Hari Bhavanam Non-Veg & Biryani',
        description: '₹100 Off on Family Dine-In, Mutton Biryani & Chettinad Specials',
        discountAmount: 100,
        merchantName: 'Hari Bhavanam',
        location: 'Avinashi Road, Peelamedu, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_rest_03',
        code: 'TRAVA-REST-50A2B',
        userId: 'usr_demo_coimbatore_01',
        category: 'RESTAURANT',
        title: 'A2B - Adyar Ananda Bhavan',
        description: '₹50 Off on Hot Evening Tiffin, Filter Coffee & Snacks Combo',
        discountAmount: 50,
        merchantName: 'A2B (Adyar Ananda Bhavan)',
        location: 'Ukkadam Bus Stand Bypass, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_mart_01',
        code: 'TRAVA-MART-60NILGIRI',
        userId: 'usr_demo_coimbatore_01',
        category: 'SUPERMARKET',
        title: 'Nilgiris 1905 Supermarket',
        description: '₹60 Off on Groceries, Fresh Dairy & Organics (Min order ₹300)',
        discountAmount: 60,
        merchantName: 'Nilgiris 1905 Supermarket',
        location: 'DB Road, RS Puram, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_mart_02',
        code: 'TRAVA-MART-40PAZHAM',
        userId: 'usr_demo_coimbatore_01',
        category: 'SUPERMARKET',
        title: 'Pazhamudir Nilayam Fresh Fruits',
        description: '₹40 Off on Farm Fresh Fruits, Vegetables & Cold-Pressed Juices',
        discountAmount: 40,
        merchantName: 'Pazhamudir Nilayam',
        location: 'Avinashi Road & Gandhipuram, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_mart_03',
        code: 'TRAVA-MART-50KANNAN',
        userId: 'usr_demo_coimbatore_01',
        category: 'SUPERMARKET',
        title: 'Kannan Jubilee Department Store',
        description: '₹50 Off on Household Essentials, Provisions & Snack Packs',
        discountAmount: 50,
        merchantName: 'Kannan Jubilee Supermarket',
        location: 'Oppanakara Street, Town Hall, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_gym_01',
        code: 'TRAVA-GYM-SLAMFIT',
        userId: 'usr_demo_coimbatore_01',
        category: 'GYM',
        title: 'Slam Fitness Studio',
        description: '3 Days Free All-Access Pass + ₹500 Off Annual Gym Membership',
        discountAmount: 500,
        merchantName: 'Slam Fitness Studio',
        location: 'Avinashi Road, Peelamedu, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_gym_02',
        code: 'TRAVA-GYM-GOLDTRAVA',
        userId: 'usr_demo_coimbatore_01',
        category: 'GYM',
        title: "Gold's Gym Coimbatore",
        description: '1 Free Personal Training Session + ₹300 Off 3-Month Fitness Pass',
        discountAmount: 300,
        merchantName: "Gold's Gym Coimbatore",
        location: 'Race Course Road, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_gym_03',
        code: 'TRAVA-GYM-CULTFIT',
        userId: 'usr_demo_coimbatore_01',
        category: 'GYM',
        title: 'Cult.fit Training Center',
        description: '₹200 Off on Cult Group Workouts, HIIT & Yoga Classes',
        discountAmount: 200,
        merchantName: 'Cult.fit Center',
        location: 'Cross Cut Road, Gandhipuram, Coimbatore',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_used_02',
        code: 'TRAVA-BAKE-USED',
        userId: 'usr_demo_coimbatore_01',
        category: 'BAKERY',
        title: 'KR Bakes Special',
        description: 'Free Premium Filter Coffee & Butter Biscuit',
        discountAmount: 35,
        merchantName: 'KR Bakes (Peelamedu)',
        location: 'Avinashi Road, Peelamedu, Coimbatore',
        status: 'REDEEMED', // Pre-redeemed test case for "Already used" verification
        assignedAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: '2026-12-31T23:59:59Z',
        redeemedAt: new Date(Date.now() - 3600000).toISOString(),
        redeemedByMerchant: 'KR Bakes Counter #1',
        isGuaranteedReward: true
      },
      {
        id: 'coup_demo_expr_03',
        code: 'TRAVA-BAKE-EXPR',
        userId: 'usr_demo_coimbatore_01',
        category: 'BAKERY',
        title: 'JM Bakery Treat',
        description: '₹30 Off Fresh Breads & Cookies',
        discountAmount: 30,
        merchantName: 'JM Bakery',
        location: 'Singanallur Junction, Coimbatore',
        status: 'EXPIRED', // Expired test case
        assignedAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-02-01T00:00:00Z',
        redeemedAt: null,
        redeemedByMerchant: null,
        isGuaranteedReward: true
      }
    ];

    this.cache.set('coupons', coupons);
    this.persistCollection('coupons');

    // 6. Scratch Cards (1 unlocked card for demonstration)
    const scratchCards = [
      {
        id: 'sc_demo_01',
        userId: 'usr_demo_coimbatore_01',
        status: 'UNLOCKED', // Unlocked, ready to scratch
        targetPoints: 100,
        unlockReason: 'Completed Eligible Route 95 Journey Contribution',
        rewardId: 'coup_demo_01',
        rewardAssigned: {
          code: 'TRAVA-BAKE-95A1',
          title: 'Annapoorna Bakery & Sweets',
          description: '₹50 Off on Any Fresh Pastry, Puff, or Traditional Sweets',
          discount: '₹50'
        },
        revealed: false,
        revealedAt: null,
        isGuaranteedReward: true,
        createdAt: new Date().toISOString()
      }
    ];
    this.cache.set('sessions', []);
    this.cache.set('journeys', []);
    this.cache.set('gps_records', []);
    this.cache.set('verification_records', []);
    this.cache.set('redemptions', []);
    this.cache.set('notifications', []);
    this.cache.set('crowd_reports', [
      {
        id: 'cr_init_01',
        routeId: 'route_95',
        busId: 'bus_95_a',
        crowdCategory: 'SEATS_AVAILABLE',
        timestamp: new Date().toISOString()
      }
    ]);

    this.persistCollection('sessions');
    this.persistCollection('journeys');
    this.persistCollection('gps_records');
    this.persistCollection('verification_records');
    this.persistCollection('redemptions');
    this.persistCollection('notifications');
    this.persistCollection('crowd_reports');

    console.log('Seeding completed successfully!');
  }
}

// Export singleton instance
const db = new JsonDatabase();
module.exports = db;
