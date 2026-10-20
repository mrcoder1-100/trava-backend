const express = require('express');
const router = express.Router();
const db = require('../repositories/db');
const busService = require('../services/bus.service');
const { getDistanceKm } = require('../utils/geo');

/**
 * Top 10 Coimbatore Hotspot Transit Routes for Trava IVR
 */
const HOTSPOT_ROUTES = [
  {
    key: '1',
    routeId: 'route_95',
    originEn: 'Gandhipuram',
    destinationEn: 'Peelamedu',
    originTa: 'காந்திபுரம்',
    destinationTa: 'பீளமேடு',
    targetStopName: 'Peelamedu',
    targetStopNameTa: 'பீளமேடு',
    defaultEta: 8,
  },
  {
    key: '2',
    routeId: 'route_95',
    originEn: 'Fun Mall',
    destinationEn: 'Hopes College',
    originTa: 'ஃபன் மால்',
    destinationTa: 'ஹோப்ஸ்',
    targetStopName: 'Fun Mall Area',
    targetStopNameTa: 'ஃபன் மால்',
    defaultEta: 5,
  },
  {
    key: '3',
    routeId: 'route_111',
    originEn: 'Gandhipuram',
    destinationEn: 'Ukkadam',
    originTa: 'காந்திபுரம்',
    destinationTa: 'உக்கடம்',
    targetStopName: 'Ukkadam',
    targetStopNameTa: 'உக்கடம்',
    defaultEta: 12,
  },
  {
    key: '4',
    routeId: 'route_20c',
    originEn: 'Gandhipuram',
    destinationEn: 'Saravanampatti',
    originTa: 'காந்திபுரம்',
    destinationTa: 'சரவணம்பட்டி',
    targetStopName: 'Saravanampatti',
    targetStopNameTa: 'சரவணம்பட்டி',
    defaultEta: 15,
  },
  {
    key: '5',
    routeId: 'route_70',
    originEn: 'Singanallur',
    destinationEn: 'Ukkadam',
    originTa: 'சிங்காநல்லூர்',
    destinationTa: 'உக்கடம்',
    targetStopName: 'Ukkadam',
    targetStopNameTa: 'உக்கடம்',
    defaultEta: 14,
  },
  {
    key: '6',
    routeId: 'route_111',
    originEn: 'Railway Station',
    destinationEn: 'Town Hall',
    originTa: 'ரயில் நிலையம்',
    destinationTa: 'டவுன் ஹால்',
    targetStopName: 'Town Hall',
    targetStopNameTa: 'டவுன் ஹால்',
    defaultEta: 6,
  },
  {
    key: '7',
    routeId: 'route_95',
    originEn: 'Lakshmi Mills',
    destinationEn: 'Nava India',
    originTa: 'லட்சுமி மில்ஸ்',
    destinationTa: 'நவ இந்தியா',
    targetStopName: 'Nava India',
    targetStopNameTa: 'நவ இந்தியா',
    defaultEta: 4,
  },
  {
    key: '8',
    routeId: 'route_20c',
    originEn: 'Ganapathy',
    destinationEn: 'CHIL SEZ',
    originTa: 'கணபதி',
    destinationTa: 'சில் செஸ்',
    targetStopName: 'CHIL SEZ',
    targetStopNameTa: 'சில் செஸ்',
    defaultEta: 9,
  },
  {
    key: '9',
    routeId: 'route_70',
    originEn: 'Ramanathapuram',
    destinationEn: 'Sungam',
    originTa: 'ராமநாதபுரம்',
    destinationTa: 'சுங்கம்',
    targetStopName: 'Sungam',
    targetStopNameTa: 'சுங்கம்',
    defaultEta: 5,
  },
  {
    key: '0',
    routeId: 'route_95',
    originEn: 'Singanallur',
    destinationEn: 'Gandhipuram',
    originTa: 'சிங்காநல்லூர்',
    destinationTa: 'காந்திபுரம்',
    targetStopName: 'Gandhipuram',
    targetStopNameTa: 'காந்திபுரம்',
    defaultEta: 18,
  },
];

/**
 * Helper to compute live dynamic ETA from real GPS coordinates
 */
function calculateLiveEtaForHotspot(hotspot) {
  try {
    const route = db.findOne('routes', r => r.id === hotspot.routeId);
    const buses = busService.getRouteBuses(hotspot.routeId) || [];
    const activeBus = buses[0] || db.findOne('bus_services', b => b.routeId === hotspot.routeId);

    if (!activeBus || !route || !route.stops) {
      return {
        etaMinutes: hotspot.defaultEta,
        busName: 'Green Express',
        busNumber: '95',
      };
    }

    let busName = activeBus.busName || activeBus.busNumber || 'City Express';
    busName = busName.replace(/TNSTC/gi, '').replace(/[—\-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!busName) busName = 'Green Express';
    const busNumber = activeBus.busNumber || route.routeNumber || '95';

    // Find target stop in route
    const targetStop = route.stops.find(
      s =>
        s.shortName?.toLowerCase() === hotspot.targetStopName.toLowerCase() ||
        s.name?.toLowerCase().includes(hotspot.targetStopName.toLowerCase())
    ) || route.stops[route.stops.length - 1];

    if (activeBus.currentLatitude && activeBus.currentLongitude && targetStop) {
      const dist = getDistanceKm(
        activeBus.currentLatitude,
        activeBus.currentLongitude,
        targetStop.latitude,
        targetStop.longitude
      );
      // Average city bus speed in Coimbatore ~26 km/h with 1.2 road curve factor
      const roadDistanceKm = dist * 1.25;
      const speedKmH = activeBus.speedKmH || 26;
      const computedEta = Math.max(2, Math.round((roadDistanceKm / speedKmH) * 60));
      return {
        etaMinutes: computedEta,
        busName,
        busNumber,
      };
    }

    return {
      etaMinutes: hotspot.defaultEta,
      busName,
      busNumber,
    };
  } catch (err) {
    console.error('IVR ETA Calculation Error:', err.message);
    return {
      etaMinutes: hotspot.defaultEta,
      busName: 'Green Express',
      busNumber: '95',
    };
  }
}

/**
 * 1. GET /api/v1/ivr/routes - Metadata list for frontend / simulator
 */
router.get('/routes', (req, res) => {
  const routesWithLiveEta = HOTSPOT_ROUTES.map(h => {
    const live = calculateLiveEtaForHotspot(h);
    return {
      ...h,
      liveEtaMinutes: live.etaMinutes,
      liveBusName: live.busName,
    };
  });
  res.json({
    success: true,
    tollFreeNumber: '1800-TRAVA-BUS (1800-87282-287)',
    hotspotRoutes: routesWithLiveEta,
  });
});

/**
 * 2. Incoming Call Webhook (Twilio Entrypoint)
 * GET & POST /api/v1/ivr/incoming
 */
const handleIncoming = (req, res) => {
  const isJson = req.headers.accept?.includes('application/json') || req.query.format === 'json';

  const welcomeTa = 'வணக்கம்! டிராவா பேருந்து நேர சேவைக்கு நல்வரவு. தமிழுக்கு 1-ஐ அழுத்தவும்.';
  const welcomeEn = 'Welcome to Trava Coimbatore. For English, press 2.';

  if (isJson) {
    return res.json({
      status: 'AWAITING_LANGUAGE',
      messageTa: welcomeTa,
      messageEn: welcomeEn,
      actions: [
        { digit: '1', language: 'Tamil' },
        { digit: '2', language: 'English' },
      ],
    });
  }

  // Twilio TwiML XML
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/v1/ivr/language" method="POST" timeout="10">
    <Say language="ta-IN">${welcomeTa}</Say>
    <Pause length="1"/>
    <Say language="en-IN">${welcomeEn}</Say>
  </Gather>
  <Say language="ta-IN">எந்த எண்ணும் தேர்ந்தெடுக்கப்படவில்லை. நன்றி, வணக்கம்.</Say>
  <Hangup/>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(twiml);
};

router.get('/incoming', handleIncoming);
router.post('/incoming', handleIncoming);

/**
 * 3. Language Selection Webhook
 * POST /api/v1/ivr/language
 */
const handleLanguage = (req, res) => {
  const digits = req.body?.Digits || req.query?.Digits || req.query?.digit || '1';
  const isTamil = digits.trim() === '1';
  const lang = isTamil ? 'ta' : 'en';

  const isJson = req.headers.accept?.includes('application/json') || req.query.format === 'json';

  let menuPrompt = '';
  if (isTamil) {
    menuPrompt =
      'கோவை முக்கிய வழித்தடங்கள்: ' +
      '1: காந்திபுரம் முதல் பீளமேடு வரை. ' +
      '2: ஃபன் மால் முதல் ஹோப்ஸ் வரை. ' +
      '3: காந்திபுரம் முதல் உக்கடம் வரை. ' +
      '4: காந்திபுரம் முதல் சரவணம்பட்டி வரை. ' +
      '5: சிங்காநல்லூர் முதல் உக்கடம் வரை. ' +
      '6: ரயில் நிலையம் முதல் டவுன் ஹால் வரை. ' +
      '7: லட்சுமி மில்ஸ் முதல் நவ இந்தியா வரை. ' +
      '8: கணபதி முதல் சில் செஸ் வரை. ' +
      '9: ராமநாதபுரம் முதல் சுங்கம் வரை. ' +
      '0: சிங்காநல்லூர் முதல் காந்திபுரம் வரை. ' +
      'உங்களுக்கு தேவையான எண்ணை அழுத்தவும்.';
  } else {
    menuPrompt =
      'Popular Coimbatore Routes: ' +
      'Press 1 for Gandhipuram to Peelamedu. ' +
      'Press 2 for Fun Mall to Hopes. ' +
      'Press 3 for Gandhipuram to Ukkadam. ' +
      'Press 4 for Gandhipuram to Saravanampatti. ' +
      'Press 5 for Singanallur to Ukkadam. ' +
      'Press 6 for Railway Station to Town Hall. ' +
      'Press 7 for Lakshmi Mills to Nava India. ' +
      'Press 8 for Ganapathy to CHIL SEZ. ' +
      'Press 9 for Ramanathapuram to Sungam. ' +
      'Press 0 for Singanallur to Gandhipuram. ' +
      'Please enter your choice now.';
  }

  if (isJson) {
    return res.json({
      status: 'AWAITING_ROUTE',
      language: lang,
      prompt: menuPrompt,
      hotspotRoutes: HOTSPOT_ROUTES.map(h => ({
        digit: h.key,
        route: isTamil ? `${h.originTa} ↔ ${h.destinationTa}` : `${h.originEn} ↔ ${h.destinationEn}`,
      })),
    });
  }

  const twimlLang = isTamil ? 'ta-IN' : 'en-IN';
  const timeoutMsg = isTamil
    ? 'எந்த எண்ணும் தேர்ந்தெடுக்கப்படவில்லை. நன்றி, வணக்கம்.'
    : 'No selection detected. Thank you for calling Trava.';

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/v1/ivr/route?lang=${lang}" method="POST" timeout="15">
    <Say language="${twimlLang}">${menuPrompt}</Say>
  </Gather>
  <Say language="${twimlLang}">${timeoutMsg}</Say>
  <Hangup/>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(twiml);
};

router.get('/language', handleLanguage);
router.post('/language', handleLanguage);

/**
 * 4. Route Selection & Dynamic ETA Webhook
 * POST /api/v1/ivr/route
 */
const handleRoute = (req, res) => {
  const digits = req.body?.Digits || req.query?.Digits || req.query?.digit || '1';
  const lang = req.query?.lang || req.body?.lang || 'ta';
  const isTamil = lang.startsWith('ta');

  const isJson = req.headers.accept?.includes('application/json') || req.query.format === 'json';

  const selectedKey = digits.toString().trim().slice(-1); // Last pressed digit
  const hotspot = HOTSPOT_ROUTES.find(h => h.key === selectedKey) || HOTSPOT_ROUTES[0];
  const live = calculateLiveEtaForHotspot(hotspot);

  let announcement = '';
  let followUp = '';

  if (isTamil) {
    announcement = `பயணிகள் கவனத்திற்கு. ${hotspot.originTa} செல்லும் பேருந்து ${live.busName}, இன்னும் ${live.etaMinutes} நிமிடங்களில் ${hotspot.destinationTa} வந்து சேரும்.`;
    followUp = 'மீண்டும் கேட்க 1-ஐ அழுத்தவும். வேறு வழித்தடத்தை அறிய 9-ஐ அழுத்தவும். அழைப்பை முடிக்க போனை வைக்கவும்.';
  } else {
    announcement = `Attention passengers. Bus ${live.busName} towards ${hotspot.originEn} will arrive at ${hotspot.destinationEn} in ${live.etaMinutes} minutes.`;
    followUp = 'To repeat, press 1. To choose another route, press 9. To end call, please hang up.';
  }

  if (isJson) {
    return res.json({
      status: 'ANNOUNCING_ETA',
      language: lang,
      selectedRoute: {
        digit: hotspot.key,
        origin: isTamil ? hotspot.originTa : hotspot.originEn,
        destination: isTamil ? hotspot.destinationTa : hotspot.destinationEn,
      },
      liveEtaMinutes: live.etaMinutes,
      busName: live.busName,
      announcementText: announcement,
      followUpPrompt: followUp,
    });
  }

  const twimlLang = isTamil ? 'ta-IN' : 'en-IN';
  const closingMsg = isTamil
    ? 'டிராவா பயன்படுத்தியதற்கு நன்றி. பாதுகாப்பான பயணம் அமையட்டும்.'
    : 'Thank you for calling Trava. Have a safe journey.';

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${twimlLang}">${announcement}</Say>
  <Pause length="1"/>
  <Gather numDigits="1" action="/api/v1/ivr/repeat?lang=${lang}&amp;routeKey=${hotspot.key}" method="POST" timeout="8">
    <Say language="${twimlLang}">${followUp}</Say>
  </Gather>
  <Say language="${twimlLang}">${closingMsg}</Say>
  <Hangup/>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(twiml);
};

router.get('/route', handleRoute);
router.post('/route', handleRoute);

/**
 * 5. Repeat / Back to menu Webhook
 * POST /api/v1/ivr/repeat
 */
const handleRepeat = (req, res) => {
  const digits = req.body?.Digits || req.query?.Digits || '1';
  const lang = req.query?.lang || 'ta';
  const prevRouteKey = req.query?.routeKey || '1';

  if (digits.trim() === '9') {
    // Back to main route menu
    req.body.Digits = lang === 'ta' ? '1' : '2';
    return handleLanguage(req, res);
  }

  // Repeat the announcement
  req.body.Digits = prevRouteKey;
  return handleRoute(req, res);
};

router.get('/repeat', handleRepeat);
router.post('/repeat', handleRepeat);

module.exports = router;
