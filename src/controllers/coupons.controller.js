const rewardsService = require('../services/rewards.service');
const db = require('../repositories/db');

function getUserCoupons(req, res) {
  const userId = req.user ? req.user.id : 'usr_demo_coimbatore_01';
  const coupons = rewardsService.getUserCoupons(userId);
  res.json({
    success: true,
    count: coupons.length,
    data: coupons
  });
}

/**
 * Validates a coupon code (Shopkeeper verification)
 */
function validateCoupon(req, res) {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_COUPON',
      message: 'Coupon code is required'
    });
  }

  const result = rewardsService.validateCoupon(code);
  res.json({
    success: result.status === 'VALID',
    ...result
  });
}

/**
 * Atomically marks a coupon as redeemed (Shopkeeper redemption)
 */
function redeemCoupon(req, res) {
  const couponIdOrCode = req.params.id || req.body.code;
  const merchantInfo = req.body.merchantInfo || 'Bakery Counter';

  if (!couponIdOrCode) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_COUPON',
      message: 'Coupon ID or code is required'
    });
  }

  const result = rewardsService.redeemCoupon(couponIdOrCode, merchantInfo);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      ...result
    });
  }

  res.json({
    success: true,
    ...result
  });
}

/**
 * Returns partner merchant profile and issued customer coupons
 */
function getPartnerCoupons(req, res) {
  const merchant = req.query.merchant || 'Annapoorna Bakery & Sweets';
  const data = rewardsService.getPartnerCoupons(merchant);
  res.json({
    success: true,
    data
  });
}

module.exports = {
  getUserCoupons,
  validateCoupon,
  redeemCoupon,
  getPartnerCoupons
};

