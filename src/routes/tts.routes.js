const express = require('express');
const https = require('https');
const router = express.Router();

// In-memory audio cache to avoid redundant external requests and deliver sub-millisecond audio
const audioCache = new Map();

/**
 * GET /api/tts
 * Query params:
 *   text: text to speak (URL encoded)
 *   lang: 'ta' (Tamil) or 'en' (English)
 */
router.get('/', (req, res) => {
  const text = req.query.text;
  const lang = req.query.lang || 'ta';

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  const cacheKey = `${lang}:${text.trim()}`;
  if (audioCache.has(cacheKey)) {
    const cachedBuffer = audioCache.get(cacheKey);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.send(cachedBuffer);
  }

  const encodedText = encodeURIComponent(text.trim());
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;

  https.get(
    googleTtsUrl,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    },
    (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode).json({
          error: `Upstream TTS service error: status ${proxyRes.statusCode}`,
        });
      }

      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        // Cache if under 1MB
        if (fullBuffer.length < 1048576) {
          audioCache.set(cacheKey, fullBuffer);
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.send(fullBuffer);
      });
    }
  ).on('error', (err) => {
    console.error('TTS Proxy Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch TTS audio', details: err.message });
  });
});

module.exports = router;
