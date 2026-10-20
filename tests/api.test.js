const request = require('supertest');
const app = require('../src/app');
const db = require('../src/repositories/db');
const busService = require('../src/services/bus.service');

describe('Trava Backend REST API Test Suite', () => {
  beforeEach(() => {
    // Reset to baseline demo state before each test
    db.seedInitialData();
  });

  afterAll(() => {
    busService.stop();
  });

  test('GET / - Should return Trava branding, tagline, and API status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.app).toBe('Trava');
    expect(res.body.tagline).toBe("People Solving People's Problem.");
    expect(res.body.status).toBe('ONLINE');
  });

  test('GET /health - Should return UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/v1/auth/login - Should successfully login demo user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'demo@trava.org', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('demo@trava.org');
    });

    test('POST /api/v1/auth/register - Should register a new user and prevent duplicates', async () => {
      const newUser = {
        fullName: 'Kovai Passenger',
        email: 'kovai@example.com',
        password: 'Password123!'
      };

      const res1 = await request(app).post('/api/v1/auth/register').send(newUser);
      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.user.email).toBe('kovai@example.com');

      // Duplicate registration attempt
      const res2 = await request(app).post('/api/v1/auth/register').send(newUser);
      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toContain('already exists');
    });
  });

  describe('Coimbatore Routes & 4 Simulated Buses', () => {
    test('GET /api/v1/routes - Should return Coimbatore Route 95', async () => {
      const res = await request(app).get('/api/v1/routes');
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      const r95 = res.body.data.find(r => r.routeNumber === '95');
      expect(r95).toBeDefined();
      expect(r95.stops.length).toBe(6);
      expect(r95.stops[0].name).toContain('Gandhipuram');
      expect(r95.stops[5].name).toContain('Singanallur');
    });

    test('GET /api/v1/routes/:id/buses - Should return 4 distinct simulated buses', async () => {
      const res = await request(app).get('/api/v1/routes/route_95/buses');
      expect(res.status).toBe(200);
      expect(res.body.isSimulatedData).toBe(true);
      expect(res.body.demoLabel).toBe('DEMO MODE · SIMULATED GPS');
      expect(res.body.data.length).toBe(4);

      const busIds = res.body.data.map(b => b.id);
      expect(busIds).toEqual(['bus_95_a', 'bus_95_b', 'bus_95_c', 'bus_95_d']);
    });

    test('GET /api/v1/buses/:id/live - Should return dynamic live coordinates and ETA', async () => {
      const res = await request(app).get('/api/v1/buses/bus_95_a/live');
      expect(res.status).toBe(200);
      expect(res.body.latitude).toBeDefined();
      expect(res.body.longitude).toBeDefined();
      expect(res.body.etaMinutes).toBeGreaterThanOrEqual(0);
      expect(res.body.demoLabel).toBe('DEMO MODE · SIMULATED GPS');
    });
  });

  describe('Share GPS, Camera Verification & Journey Lifecycle', () => {
    test('Complete flow: Start journey -> submit mock photo -> record GPS -> stop journey -> award points', async () => {
      // 1. Start Journey
      const startRes = await request(app)
        .post('/api/v1/journeys/start')
        .send({
          routeId: 'route_95',
          busId: 'bus_95_a',
          boardingStopId: 'stop_gandhipuram',
          destinationStopId: 'stop_singanallur',
          mockVerification: true
        });

      expect(startRes.status).toBe(201);
      expect(startRes.body.journey.id).toBeDefined();
      expect(startRes.body.verification.status).toBe('VERIFIED');
      expect(startRes.body.verification.verificationMode).toBe('DEMO_MOCK_VERIFICATION');

      const journeyId = startRes.body.journey.id;

      // 2. Send GPS batch
      const gpsRes = await request(app)
        .post('/api/v1/gps/batch')
        .send({
          journeyId,
          records: [
            { latitude: 11.017, longitude: 76.969, accuracy: 5.0 },
            { latitude: 11.019, longitude: 76.975, accuracy: 6.0 }
          ]
        });

      expect(gpsRes.status).toBe(200);
      expect(gpsRes.body.count).toBe(2);

      // 3. Stop journey
      const stopRes = await request(app).post(`/api/v1/journeys/${journeyId}/stop`).send({});
      expect(stopRes.status).toBe(200);
      expect(stopRes.body.journey.status).toBe('COMPLETED');
      expect(stopRes.body.pointsResult.pointsAwarded).toBe(50);
      expect(stopRes.body.pointsResult.currentBalance).toBe(100); // 50 + 50 = 100!
      // Threshold reached (100) -> unlocked scratch card!
      expect(stopRes.body.pointsResult.unlockedCard).toBeDefined();
      expect(stopRes.body.pointsResult.unlockedCard.isGuaranteedReward).toBe(true);
    });
  });

  describe('Rewards & Guaranteed Scratch Card', () => {
    test('GET /api/v1/rewards/balance - Should return balance and target progress', async () => {
      const res = await request(app).get('/api/v1/rewards/balance');
      expect(res.status).toBe(200);
      expect(res.body.data.target).toBe(100);
    });

    test('Scratch card has guaranteed reward, no losing cards', async () => {
      const res = await request(app).get('/api/v1/rewards/scratch-cards');
      expect(res.status).toBe(200);
      const card = res.body.data[0];
      expect(card.isGuaranteedReward).toBe(true);
      expect(card.reward).toBeDefined();
      expect(card.reward.code).toBeDefined();
    });
  });

  describe('Bakery Coupon Validation & Atomic Redemption', () => {
    test('POST /api/v1/coupons/validate - Valid coupon returns VALID', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'TRAVA-BAKE-95A1' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('VALID');
      expect(res.body.message).toContain('valid and has not been redeemed');
      expect(res.body.coupon.discountAmount).toBe(50);
    });

    test('POST /api/v1/coupons/validate - Pre-redeemed coupon returns ALREADY USED', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'TRAVA-BAKE-USED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ALREADY_USED');
      expect(res.body.message).toContain('already been redeemed');
    });

    test('POST /api/v1/coupons/validate - Expired coupon returns EXPIRED', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'TRAVA-BAKE-EXPR' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('EXPIRED');
    });

    test('POST /api/v1/coupons/validate - Invalid code returns INVALID_COUPON', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'FAKE-CODE-999' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INVALID_COUPON');
    });

    test('Atomic Redemption & Repeat Prevention: Redeeming once succeeds, redeeming second time is strictly rejected', async () => {
      // 1. Redeem active coupon
      const redeemRes1 = await request(app)
        .post('/api/v1/coupons/redeem')
        .send({ code: 'TRAVA-BAKE-95A1', merchantInfo: 'Annapoorna Bakery Counter' });

      expect(redeemRes1.status).toBe(200);
      expect(redeemRes1.body.success).toBe(true);
      expect(redeemRes1.body.status).toBe('REDEEMED_SUCCESSFULLY');

      // 2. Immediate validation now shows ALREADY USED
      const valRes = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'TRAVA-BAKE-95A1' });

      expect(valRes.status).toBe(200);
      expect(valRes.body.status).toBe('ALREADY_USED');

      // 3. Second redemption attempt is blocked
      const redeemRes2 = await request(app)
        .post('/api/v1/coupons/redeem')
        .send({ code: 'TRAVA-BAKE-95A1', merchantInfo: 'Annapoorna Bakery Counter' });

      expect(redeemRes2.status).toBe(400);
      expect(redeemRes2.body.success).toBe(false);
      expect(redeemRes2.body.status).toBe('ALREADY_USED');
    });

    test('Concurrent redemption protection: Simultaneous requests cannot both succeed', async () => {
      // Send two concurrent redemptions for same coupon
      const [resA, resB] = await Promise.all([
        request(app).post('/api/v1/coupons/redeem').send({ code: 'TRAVA-BAKE-95A1' }),
        request(app).post('/api/v1/coupons/redeem').send({ code: 'TRAVA-BAKE-95A1' })
      ]);

      const successCount = (resA.body.success ? 1 : 0) + (resB.body.success ? 1 : 0);
      expect(successCount).toBe(1); // Exactly one succeeds!
    });
  });

  describe('Demo Controls', () => {
    test('POST /api/v1/demo/reset - Restores pristine baseline state', async () => {
      const res = await request(app).post('/api/v1/demo/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify coupon is back to active
      const valRes = await request(app)
        .post('/api/v1/coupons/validate')
        .send({ code: 'TRAVA-BAKE-95A1' });
      expect(valRes.body.status).toBe('VALID');
    });

    test('POST /api/v1/demo/pass-the-torch - Seamless contributor handoff', async () => {
      const res = await request(app)
        .post('/api/v1/demo/pass-the-torch')
        .send({ busId: 'bus_95_a' });
      expect(res.status).toBe(200);
      expect(res.body.bus.trackingStatus).toBe('LIVE_CONTRIBUTOR');
    });
  });
});
