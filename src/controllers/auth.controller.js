const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    const result = await authService.register({ fullName, email, password });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message
    });
  }
}

async function logout(req, res) {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: req.user
  });
}

/**
 * Partner Merchant Authentication (Bakery / Restaurant)
 */
async function partnerLogin(req, res) {
  try {
    const { email, password, isDemo } = req.body;

    // 1-Click Demo Partner Login as Annapoorna Bakery & Sweets
    if (isDemo || (email && email.toLowerCase().includes('annapoorna'))) {
      return res.status(200).json({
        success: true,
        message: 'Partner demo authentication successful',
        token: 'trava_demo_partner_jwt_annapoorna_bakery',
        partner: {
          id: 'partner_demo_annapoorna_01',
          partnerId: 'TRV-BAKE-042',
          businessName: 'Annapoorna Bakery & Sweets',
          ownerName: 'Sundar Raman',
          email: 'bakery@annapoorna.trava',
          category: 'Bakery & Sweets',
          location: 'Shop #4, Gandhipuram Central Bus Stand Terminal, Coimbatore',
          rating: 4.9,
          badge: 'Verified Trava Transit Partner',
          role: 'PARTNER'
        }
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.login({ email, password });
    return res.status(200).json({
      success: true,
      message: 'Partner login successful',
      token: result.token,
      partner: {
        id: result.user.id,
        partnerId: 'TRV-BAKE-042',
        businessName: result.user.businessName || 'Annapoorna Bakery & Sweets',
        ownerName: result.user.fullName,
        email: result.user.email,
        category: result.user.category || 'Bakery & Sweets',
        location: result.user.location || 'Gandhipuram Central, Coimbatore',
        rating: 4.9,
        badge: 'Verified Trava Transit Partner',
        role: 'PARTNER'
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message
    });
  }
}

async function partnerRegister(req, res) {
  try {
    const { businessName, ownerName, email, password, category, location } = req.body;
    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Business name, owner name, email, and password are required'
      });
    }

    const result = await authService.register({
      fullName: ownerName,
      email,
      password
    });

    return res.status(201).json({
      success: true,
      message: 'Partner registered successfully',
      token: result.token,
      partner: {
        id: result.user.id,
        partnerId: `TRV-${(category || 'BAKE').substring(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        businessName,
        ownerName,
        email,
        category: category || 'Bakery & Sweets',
        location: location || 'Gandhipuram Central, Coimbatore',
        rating: 5.0,
        badge: 'Verified Trava Transit Partner',
        role: 'PARTNER'
      }
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  partnerLogin,
  partnerRegister
};

