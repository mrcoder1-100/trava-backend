const express = require('express');
const router = express.Router();
const couponsController = require('../controllers/coupons.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/', optionalAuth, couponsController.getUserCoupons);
router.get('/partner', couponsController.getPartnerCoupons);
router.post('/validate', couponsController.validateCoupon);
router.post('/:id/redeem', couponsController.redeemCoupon);
router.post('/redeem', couponsController.redeemCoupon);

module.exports = router;
